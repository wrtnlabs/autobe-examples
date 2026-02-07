import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_system_logs_create } from "../../../generate/generate_random_community_platform_admin_system_logs_create";
import { prepare_random_community_platform_system_log } from "../../../prepare/prepare_random_community_platform_system_log";

export async function test_api_system_log_update_message_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin auth
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminpassword123",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create log entry to update
  const createdLog =
    await generate_random_community_platform_admin_system_logs_create(
      adminConnection,
      {
        body: {
          level: "INFO",
          message: "Original log message",
        } satisfies ICommunityPlatformSystemLog.ICreate,
      },
    );
  typia.assert(createdLog);
  // 3. Update log message
  const updatedLog =
    await api.functional.communityPlatform.admin.system.logs.update(
      adminConnection,
      {
        id: createdLog.id,
        body: {
          level: createdLog.level,
          message: "Updated log message",
        } satisfies ICommunityPlatformSystemLog.IUpdate,
      },
    );
  typia.assert(updatedLog);
  // 4. Validate
  TestValidator.equals(
    "message updated",
    updatedLog.message,
    "Updated log message",
  );
  TestValidator.equals("level unchanged", updatedLog.level, createdLog.level);
  TestValidator.equals(
    "context unchanged",
    updatedLog.context,
    createdLog.context,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedLog.created_at,
    createdLog.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedLog.updated_at,
    createdLog.updated_at,
  );
}
