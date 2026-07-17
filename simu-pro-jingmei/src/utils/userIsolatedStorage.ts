// 从存储键中提取session时间戳，用于比较新旧
function extractSessionTimestamp(storageKey: string): number {
  // 键格式: xxx_userId_session_TIMESTAMP_RANDOM
  const match = storageKey.match(/session_(\d+)_/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

// 获取当前用户ID（从localStorage中的userInfo获取）
function resolveUserId(): string {
  try {
    const allKeys = Object.keys(localStorage);
    const sessionId = sessionStorage.getItem('currentSessionId') || 'default';

    // 首先尝试用当前sessionId查找userInfo
    let userInfoKeys = allKeys.filter(k =>
      k.startsWith('userInfo_') && k.includes(sessionId)
    );

    // 如果当前sessionId找不到userInfo，尝试查找任何userInfo键
    if (userInfoKeys.length === 0) {
      userInfoKeys = allKeys.filter(k => k.startsWith('userInfo_'));
    }

    if (userInfoKeys.length > 0) {
      const userInfo = JSON.parse(localStorage.getItem(userInfoKeys[0]) || '{}');
      return userInfo.id || 'anonymous';
    }
  } catch (error) {
    console.warn('解析用户信息失败:', error);
  }
  return 'anonymous';
}

// 用户隔离存储适配器
function createUserIsolatedStorage() {
  return {
    getItem(key: string) {
      try {
        const sessionId = sessionStorage.getItem('currentSessionId') || 'default';
        const userId = resolveUserId();
        const allKeys = Object.keys(localStorage);

        // 首先尝试用当前的会话ID获取数据
        const isolatedKey = `${key}_${userId}_${sessionId}`;
        let value = localStorage.getItem(isolatedKey);

        // 如果找不到，查找所有匹配的旧sessionId数据，选择最新（时间戳最大）的那个
        if (!value) {
          console.log(`[userIsolatedStorage] 未找到当前sessionId的数据 (${isolatedKey}), 尝试查找旧sessionId的数据...`);

          const prefix = `${key}_${userId}_`;
          let latestKey = '';
          let latestTimestamp = 0;

          for (const storageKey of allKeys) {
            if (storageKey.startsWith(prefix) && storageKey !== isolatedKey) {
              const timestamp = extractSessionTimestamp(storageKey);
              if (timestamp > latestTimestamp) {
                const candidateValue = localStorage.getItem(storageKey);
                if (candidateValue) {
                  latestTimestamp = timestamp;
                  latestKey = storageKey;
                  value = candidateValue;
                }
              }
            }
          }

          if (value && latestKey) {
            console.log(`[userIsolatedStorage] 从最新的旧sessionId数据中恢复: ${latestKey} (timestamp: ${latestTimestamp})`);
            // 将最新的旧数据迁移到新的isolatedKey下
            localStorage.setItem(isolatedKey, value);

            // 清理所有旧的session键（保留当前的）
            for (const storageKey of allKeys) {
              if (storageKey.startsWith(prefix) && storageKey !== isolatedKey) {
                localStorage.removeItem(storageKey);
              }
            }
          }
        }

        return value;
      } catch (error) {
        console.warn('获取存储数据失败:', error);
        return null;
      }
    },

    setItem(key: string, value: string) {
      try {
        const sessionId = sessionStorage.getItem('currentSessionId') || 'default';
        const userId = resolveUserId();

        const isolatedKey = `${key}_${userId}_${sessionId}`;
        localStorage.setItem(isolatedKey, value);

        // 写入新数据后，清理同一key+userId下的旧session键
        const prefix = `${key}_${userId}_`;
        const allKeys = Object.keys(localStorage);
        for (const storageKey of allKeys) {
          if (storageKey.startsWith(prefix) && storageKey !== isolatedKey) {
            localStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.warn('保存存储数据失败:', error);
      }
    },

    removeItem(key: string) {
      try {
        const sessionId = sessionStorage.getItem('currentSessionId') || 'default';
        const userId = resolveUserId();

        const isolatedKey = `${key}_${userId}_${sessionId}`;
        localStorage.removeItem(isolatedKey);
      } catch (error) {
        console.warn('删除存储数据失败:', error);
      }
    }
  };
}

export { createUserIsolatedStorage };
