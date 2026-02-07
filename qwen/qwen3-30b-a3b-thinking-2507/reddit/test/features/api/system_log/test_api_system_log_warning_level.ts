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

export async function test_api_system_log_warning_level(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  const log = await generate_random_community_platform_admin_system_logs_create(
    adminConnection,
    {
      body: {
        level: "WARNING",
        message: "Performance monitoring: CPU usage at 90%",
        context:
          "System load monitor detected 90% CPU utilization on cluster node A",
        data: null,
      },
    },
  );
  typia.assert(log);
  TestValidator.equals("level matches", log.level, "WARNING");
  TestValidator.equals(
    "message matches",
    log.message,
    "Performance monitoring: CPU usage at 90%",
  );
  TestValidator.equals(
    "context matches",
    log.context,
    "System load monitor detected 90% CPU utilization on cluster node A",
  );
  TestValidator.equals("data is null", log.data, null);
}
