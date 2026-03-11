import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test successful retrieval of a specific audit log parameter by a super administrator.
 * Verifies complete parameter details including key-value pair, timestamps, and parent audit log relationship.
 */
export async function test_api_superadmin_audit_log_parameter_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate random UUIDs for audit log and parameter
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const parameterId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the specific audit log parameter
  const parameter =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.at(
      superAdminConnection,
      {
        auditLogId,
        parameterId,
      },
    );
  typia.assert(parameter);
  // Validate parameter belongs to correct audit log
  TestValidator.equals(
    "parameter belongs to correct audit log",
    parameter.system_audit_log_id,
    auditLogId,
  );
}
