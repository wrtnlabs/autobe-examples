import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_auth_admin_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. 創建管理員帳號並獲取初始會話令牌
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 獲取有效的刷新令牌（但我們將模擬它已過期）
  const validRefreshToken = admin.token.refresh;
  // 2. 測試使用有效的刷新令牌格式但服務器視為過期/無效的令牌
  // 注意：我們無法實際使令牌過期，但我們可以測試系統如何處理無效的令牌字符串
  await TestValidator.error("無效刷新令牌應被拒絕", async () => {
    // 創建一個獨立的連接來測試
    const freshConnection: api.IConnection = { host: connection.host };
    // 使用格式正確但服務器無法識別的令牌
    const invalidToken =
      typia.random<IDiscussionBoardAdmin.IRefresh>().refresh_token;
    await api.functional.discussionBoard.auth.admin.refresh(freshConnection, {
      body: {
        refresh_token: invalidToken,
      } satisfies IDiscussionBoardAdmin.IRefresh,
    });
  });
  // 3. 測試空令牌字符串（格式正確但內容無效）
  await TestValidator.error("空刷新令牌應被拒絕", async () => {
    const testConnection: api.IConnection = { host: connection.host };
    await api.functional.discussionBoard.auth.admin.refresh(testConnection, {
      body: { refresh_token: "" } satisfies IDiscussionBoardAdmin.IRefresh,
    });
  });
  // 4. 測試使用系統中不存在的隨機令牌
  await TestValidator.error("隨機令牌應被拒絕", async () => {
    const randomConnection: api.IConnection = { host: connection.host };
    const randomRefreshToken = RandomGenerator.alphaNumeric(64);
    await api.functional.discussionBoard.auth.admin.refresh(randomConnection, {
      body: {
        refresh_token: randomRefreshToken,
      } satisfies IDiscussionBoardAdmin.IRefresh,
    });
  });
}
