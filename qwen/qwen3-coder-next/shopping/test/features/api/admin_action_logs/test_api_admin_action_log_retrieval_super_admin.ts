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

export async function test_api_admin_action_log_retrieval_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  // Get a random admin action log ID
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Super admin retrieves admin action log
  const log = await api.functional.ecommerceMall.admin.admin_action_logs.at(
    superAdminConnection,
    { logId },
  );
  typia.assert(log);
  // Validate log contains expected fields
  TestValidator.predicate("log has admin", log.admin !== null);
  TestValidator.equals("log has action type", typeof log.action_type, "string");
  TestValidator.equals("log has target id", typeof log.target_id, "string");
  TestValidator.equals("log has description", typeof log.description, "string");
  TestValidator.predicate("log has timestamp", log.created_at !== undefined);
  TestValidator.predicate("log has admin summary", log.admin !== null);
  TestValidator.equals("admin has id", typeof log.admin.id, "string");
  TestValidator.equals("admin has email", typeof log.admin.email, "string");
  TestValidator.equals(
    "admin has grade",
    log.admin.grade === "regular" || log.admin.grade === "super",
    true,
  );
}
