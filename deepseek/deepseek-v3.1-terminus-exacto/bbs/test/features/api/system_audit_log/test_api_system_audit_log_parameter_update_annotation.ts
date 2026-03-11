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
import { generate_random_discussion_board_super_admin_system_audit_logs_parameters_create } from "../../../generate/generate_random_discussion_board_super_admin_system_audit_logs_parameters_create";
import { prepare_random_discussion_board_system_audit_log_parameter } from "../../../prepare/prepare_random_discussion_board_system_audit_log_parameter";

/**
 * Test the scenario where a super administrator adds administrative annotations to an existing audit log parameter.
 * This validates the business use case of enhancing audit trail metadata for forensic analysis and compliance reporting.
 * Verify that the parameter update maintains data integrity by preserving the original parameter structure while allowing value modifications.
 * Test that the operation properly validates the parameter belongs to the specified audit log and that the modification is itself logged for traceability.
 * Ensure the response includes complete updated parameter information with proper timestamps.
 */
export async function test_api_system_audit_log_parameter_update_annotation(
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
  // Generate a random audit log ID for parameter creation
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // Create an initial audit log parameter
  const initialParameter =
    await generate_random_discussion_board_super_admin_system_audit_logs_parameters_create(
      superAdminConnection,
      {
        body: {
          parameterKey: "annotation",
          parameterValue: "Initial audit parameter value",
        },
        params: { auditLogId },
      },
    );
  typia.assert(initialParameter);
  // Update the parameter with administrative annotation
  const updatedParameter =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.update(
      superAdminConnection,
      {
        auditLogId,
        parameterId: initialParameter.id,
        body: {
          parameter_value:
            "Administrative annotation: Enhanced metadata for compliance reporting",
        } satisfies IDiscussionBoardSystemAuditLogParameter.IUpdate,
      },
    );
  typia.assert(updatedParameter);
  // Validate parameter structure is preserved
  TestValidator.equals(
    "parameter ID unchanged",
    updatedParameter.id,
    initialParameter.id,
  );
  TestValidator.equals(
    "parameter key unchanged",
    updatedParameter.parameter_key,
    initialParameter.parameter_key,
  );
  TestValidator.equals(
    "audit log ID unchanged",
    updatedParameter.system_audit_log_id,
    initialParameter.system_audit_log_id,
  );
  TestValidator.equals(
    "creation timestamp unchanged",
    updatedParameter.created_at,
    initialParameter.created_at,
  );
  // Validate parameter value is updated
  TestValidator.notEquals(
    "parameter value updated",
    updatedParameter.parameter_value,
    initialParameter.parameter_value,
  );
  TestValidator.predicate(
    "new value contains annotation",
    updatedParameter.parameter_value.includes("Administrative annotation"),
  );
  // Validate timestamp is updated
  TestValidator.notEquals(
    "updated timestamp changed",
    updatedParameter.updated_at,
    initialParameter.updated_at,
  );
  TestValidator.predicate(
    "updated timestamp is valid",
    new Date(updatedParameter.updated_at) >
      new Date(initialParameter.updated_at),
  );
}
