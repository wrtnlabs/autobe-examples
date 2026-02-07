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

export async function test_api_system_log_update_level_and_message(
  connection: api.IConnection,
): Promise<void> {
  // Auth as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    },
  });
  // Create log entry with WARNING level
  const log = await generate_random_community_platform_admin_system_logs_create(
    adminConnection,
    {
      body: {
        level: "WARNING",
        message: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(log);
  // Update log entry to ERROR level
  const newMessage = RandomGenerator.paragraph({ sentences: 3 });
  const updatedLog =
    await api.functional.communityPlatform.admin.system.logs.update(
      adminConnection,
      {
        id: log.id,
        body: {
          level: "ERROR",
          message: newMessage,
        } satisfies ICommunityPlatformSystemLog.IUpdate,
      },
    );
  typia.assert(updatedLog);
  // Validate the log update
  TestValidator.equals("level changed to ERROR", updatedLog.level, "ERROR");
  TestValidator.equals("message updated", updatedLog.message, newMessage);
}
