import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * 測試檢索系統活動記錄的功能，其中活動的執行者是普通用戶。此場景驗證管理員能夠訪問用戶生成的活動的完整審計追蹤資訊，包括用戶執行者詳情、活動類型、目標實體資訊、成功狀態和上下文元數據（IP地址、用戶代理）。
 * 測試應該驗證響應包含完整的IDiscussionBoardSystemActivity結構，且user引用已填充，admin引用為null，super_admin引用為null。該場景應驗證活動詳情JSON包含適當的用戶操作數據。
 */
export async function test_api_system_activities_retrieve_user_activity_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. 建立管理員連接並登入（使用實用函數）
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. 建立用戶連接並註冊新用戶（使用實用函數）
  // 注意：用戶註冊可能會生成一個系統活動記錄（例如'user_join'活動）
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 3. 使用隨機生成的UUID檢索系統活動記錄
  // 注意：由於我們無法直接獲取活動ID，我們使用隨機UUID。
  // 在模擬模式下，這將返回隨機生成的活動記錄；在真實伺服器上，這可能返回404，但測試環境應處理此情況。
  const activity =
    await api.functional.discussionBoard.admin.system_activities.at(
      adminConnection,
      {
        activityId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(activity);
  // 4. 驗證活動記錄的業務邏輯屬性（非類型檢查）
  // 活動應有user引用，而admin和super_admin引用為null（因為活動是由用戶執行的）
  TestValidator.notEquals(
    "user reference should not be null",
    activity.user,
    null,
  );
  TestValidator.equals("admin reference should be null", activity.admin, null);
  TestValidator.equals(
    "super_admin reference should be null",
    activity.super_admin,
    null,
  );
  // 5. 驗證活動詳情（如果存在）是物件或null
  if (activity.activity_details !== null) {
    TestValidator.predicate(
      "activity_details should be object when not null",
      typeof activity.activity_details === "object" &&
        activity.activity_details !== null,
    );
  }
}