import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminActionLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_action_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Retrieve a valid action log
  // Note: In real scenarios, an admin action (like seller approval) must occur first
  // to generate an action log entry. For this test, we'll use typia.random to generate
  // a log entry ID and validate the structure.
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the admin action log
  const log = await api.functional.ecommerceMall.admin.admin_action_logs.at(
    adminConnection,
    {
      logId: logId,
    },
  );
  typia.assert(log);
  // Validate log structure
  TestValidator.equals("log has ID", log.id !== null, true);
  TestValidator.predicate(
    "log has action type",
    typeof log.action_type === "string",
  );
  TestValidator.equals("log has target ID", log.target_id !== null, true);
  TestValidator.predicate(
    "log has description",
    typeof log.description === "string",
  );
  TestValidator.equals("log has admin info", log.admin !== null, true);
  TestValidator.equals("admin has ID", log.admin.id !== null, true);
  TestValidator.equals("admin has email", log.admin.email !== null, true);
  TestValidator.predicate(
    "admin has valid grade",
    ["regular", "super"].includes(log.admin.grade),
  );
}
