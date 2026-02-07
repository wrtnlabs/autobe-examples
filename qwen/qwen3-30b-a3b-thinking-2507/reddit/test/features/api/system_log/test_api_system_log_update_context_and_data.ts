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

export async function test_api_system_log_update_context_and_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create log entry to update
  const log = await generate_random_community_platform_admin_system_logs_create(
    adminConnection,
    {
      body: {
        level: "INFO",
        message: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformSystemLog.ICreate,
    },
  );
  typia.assert(log);
  // 3. Update the log's context and data fields
  const newContext = RandomGenerator.paragraph({ sentences: 3 });
  const newData = JSON.stringify({
    key: "value",
    randomId: RandomGenerator.alphaNumeric(8),
  });
  const updatedLog =
    await api.functional.communityPlatform.admin.system.logs.update(
      adminConnection,
      {
        id: log.id,
        body: {
          context: newContext,
          data: newData,
          level: log.level,
        } satisfies ICommunityPlatformSystemLog.IUpdate,
      },
    );
  typia.assert(updatedLog);
  // 4. Validate the update
  TestValidator.equals("context updated", updatedLog.context, newContext);
  TestValidator.equals("data updated", updatedLog.data, newData);
  TestValidator.equals("log level unchanged", updatedLog.level, "INFO");
  TestValidator.equals("message unchanged", updatedLog.message, log.message);
}