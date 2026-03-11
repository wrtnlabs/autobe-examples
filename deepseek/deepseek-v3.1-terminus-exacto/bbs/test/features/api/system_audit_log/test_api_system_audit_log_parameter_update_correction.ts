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

export async function test_api_system_audit_log_parameter_update_correction(
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
  // Generate a system audit log parameter using utility function
  // Note: The auditLogId should come from an existing audit log, but since we don't have
  // an audit log creation utility, we'll use a realistic UUID format
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const originalParameter =
    await generate_random_discussion_board_super_admin_system_audit_logs_parameters_create(
      superAdminConnection,
      {
        body: {
          parameterKey: RandomGenerator.alphabets(10),
          parameterValue: RandomGenerator.alphabets(20),
        } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate,
        params: { auditLogId },
      },
    );
  typia.assert(originalParameter);
  // Update the parameter with corrected value
  const correctedValue = RandomGenerator.alphabets(25);
  const updatedParameter =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.update(
      superAdminConnection,
      {
        auditLogId,
        parameterId: originalParameter.id,
        body: {
          parameter_value: correctedValue,
        } satisfies IDiscussionBoardSystemAuditLogParameter.IUpdate,
      },
    );
  typia.assert(updatedParameter);
  // Validate immutable fields remain unchanged
  TestValidator.equals(
    "parameter key unchanged",
    updatedParameter.parameter_key,
    originalParameter.parameter_key,
  );
  TestValidator.equals(
    "audit log ID unchanged",
    updatedParameter.system_audit_log_id,
    originalParameter.system_audit_log_id,
  );
  TestValidator.equals(
    "parameter ID unchanged",
    updatedParameter.id,
    originalParameter.id,
  );
  // Validate updated value
  TestValidator.equals(
    "parameter value updated",
    updatedParameter.parameter_value,
    correctedValue,
  );
  // Validate timestamp updates
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedParameter.updated_at) >
      new Date(originalParameter.created_at),
  );
  // Verify that created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedParameter.created_at,
    originalParameter.created_at,
  );
  // Test authorization: non-superAdmin should not be able to update parameters
  // Create a regular user connection (non-superAdmin) and attempt the update
  const regularConnection: api.IConnection = { host: connection.host };
  // Since we don't have a regular user authorization utility, we'll test that
  // the connection without superAdmin privileges fails
  await TestValidator.error(
    "non-superAdmin cannot update audit log parameters",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.update(
        regularConnection,
        {
          auditLogId,
          parameterId: originalParameter.id,
          body: {
            parameter_value: correctedValue,
          } satisfies IDiscussionBoardSystemAuditLogParameter.IUpdate,
        },
      );
    },
  );
}
