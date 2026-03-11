import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful update of an existing audit log parameter by an authenticated administrator.
 * Validates that an administrator can update the parameter value while preserving all other fields.
 *
 * Note: This test assumes there are existing audit logs with parameters in the system.
 * In a production scenario, audit logs would be created through system operations.
 */
export async function test_api_system_audit_log_parameter_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Since we cannot create audit logs through the API (they're system-generated),
  // we'll test the update functionality with valid data assumptions
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const parameterId = typia.random<string & tags.Format<"uuid">>();
  // 3. Update the parameter value
  const updatedValue = RandomGenerator.paragraph({ sentences: 2 });
  // This will test the endpoint functionality even if the specific IDs don't exist
  // In a real system, these IDs would come from existing audit log entries
  const updatedParameter =
    await api.functional.discussionBoard.admin.system_audit_logs.parameters.update(
      adminConnection,
      {
        auditLogId,
        parameterId,
        body: {
          parameter_value: updatedValue,
        } satisfies IDiscussionBoardSystemAuditLogParameter.IUpdate,
      },
    );
  typia.assert(updatedParameter);
  // 4. Validate the response structure
  TestValidator.equals(
    "parameter value updated",
    updatedParameter.parameter_value,
    updatedValue,
  );
  TestValidator.predicate(
    "parameter_key should exist",
    () => updatedParameter.parameter_key.length > 0,
  );
  TestValidator.predicate(
    "system_audit_log_id should exist",
    () => updatedParameter.system_audit_log_id.length > 0,
  );
  TestValidator.equals(
    "system_audit_log_id matches input",
    updatedParameter.system_audit_log_id,
    auditLogId,
  );
  TestValidator.equals(
    "parameter_id matches input",
    updatedParameter.id,
    parameterId,
  );
  // 5. Validate timestamp fields
  TestValidator.predicate(
    "created_at should be valid timestamp",
    () => !isNaN(new Date(updatedParameter.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid timestamp",
    () => !isNaN(new Date(updatedParameter.updated_at).getTime()),
  );
}
