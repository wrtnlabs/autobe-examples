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

export async function test_api_system_logs_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create a system log entry
  const systemLog =
    await generate_random_community_platform_admin_system_logs_create(
      adminConnection,
      {},
    );
  typia.assert(systemLog);
  // 3. Retrieve the system log by ID
  const retrievedLog =
    await api.functional.communityPlatform.admin.system.logs.at(
      adminConnection,
      {
        id: systemLog.id,
      },
    );
  typia.assert(retrievedLog);
  // 4. Validate all fields
  TestValidator.equals("ID matches", retrievedLog.id, systemLog.id);
  TestValidator.equals("Level matches", retrievedLog.level, systemLog.level);
  TestValidator.equals(
    "Message matches",
    retrievedLog.message,
    systemLog.message,
  );
  TestValidator.equals(
    "Context matches",
    retrievedLog.context,
    systemLog.context,
  );
  TestValidator.equals("Data matches", retrievedLog.data, systemLog.data);
  TestValidator.equals(
    "Created at matches",
    retrievedLog.created_at,
    systemLog.created_at,
  );
  TestValidator.equals(
    "Updated at matches",
    retrievedLog.updated_at,
    systemLog.updated_at,
  );
  TestValidator.equals(
    "Deleted at matches",
    retrievedLog.deleted_at,
    systemLog.deleted_at,
  );
}
