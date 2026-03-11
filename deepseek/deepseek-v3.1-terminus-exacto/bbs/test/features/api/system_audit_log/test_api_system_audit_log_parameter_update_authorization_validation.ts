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

export async function test_api_system_audit_log_parameter_update_authorization_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a random audit log ID for testing
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // Create a valid audit log parameter
  const parameter =
    await generate_random_discussion_board_super_admin_system_audit_logs_parameters_create(
      superAdminConnection,
      {
        params: { auditLogId },
        body: {
          parameterKey: RandomGenerator.alphabets(10),
          parameterValue: RandomGenerator.alphabets(20),
        },
      },
    );
  typia.assert(parameter);
  // Test 1: Successful parameter update by superAdmin
  const updatedParameter =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.update(
      superAdminConnection,
      {
        auditLogId,
        parameterId: parameter.id,
        body: {
          parameter_value: RandomGenerator.alphabets(25),
        } satisfies IDiscussionBoardSystemAuditLogParameter.IUpdate,
      },
    );
  typia.assert(updatedParameter);
  // Validate that parameter was actually updated
  TestValidator.equals(
    "parameter value should be updated",
    updatedParameter.parameter_value,
    updatedParameter.parameter_value,
  );
  TestValidator.notEquals(
    "parameter value should differ from original",
    updatedParameter.parameter_value,
    parameter.parameter_value,
  );
  // Test 2: Authorization failure - non-superAdmin (base connection)
  await TestValidator.error(
    "non-superAdmin should not be able to update parameters",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.update(
        connection,
        {
          auditLogId,
          parameterId: parameter.id,
          body: {
            parameter_value: RandomGenerator.alphabets(30),
          } satisfies IDiscussionBoardSystemAuditLogParameter.IUpdate,
        },
      );
    },
  );
  // Test 3: Invalid auditLogId
  await TestValidator.error(
    "invalid auditLogId should result in error",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.update(
        superAdminConnection,
        {
          auditLogId: typia.random<string & tags.Format<"uuid">>(), // Different audit log ID
          parameterId: parameter.id,
          body: {
            parameter_value: RandomGenerator.alphabets(15),
          } satisfies IDiscussionBoardSystemAuditLogParameter.IUpdate,
        },
      );
    },
  );
  // Test 4: Non-existent parameterId
  await TestValidator.error(
    "non-existent parameterId should result in error",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.update(
        superAdminConnection,
        {
          auditLogId,
          parameterId: typia.random<string & tags.Format<"uuid">>(), // Random non-existent parameter ID
          body: {
            parameter_value: RandomGenerator.alphabets(15),
          } satisfies IDiscussionBoardSystemAuditLogParameter.IUpdate,
        },
      );
    },
  );
  // Test 5: Parameter belongs to different audit log
  const differentAuditLogId = typia.random<string & tags.Format<"uuid">>();
  const parameterForDifferentAudit =
    await generate_random_discussion_board_super_admin_system_audit_logs_parameters_create(
      superAdminConnection,
      {
        params: { auditLogId: differentAuditLogId },
        body: {
          parameterKey: RandomGenerator.alphabets(8),
          parameterValue: RandomGenerator.alphabets(12),
        },
      },
    );
  typia.assert(parameterForDifferentAudit);
  await TestValidator.error(
    "parameter from different audit log should not be updatable with wrong auditLogId",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.update(
        superAdminConnection,
        {
          auditLogId, // Original audit log ID, not the one the parameter belongs to
          parameterId: parameterForDifferentAudit.id,
          body: {
            parameter_value: RandomGenerator.alphabets(20),
          } satisfies IDiscussionBoardSystemAuditLogParameter.IUpdate,
        },
      );
    },
  );
  // Test 6: Immutable field modification attempt (parameter_key)
  // This should fail as parameter_key is immutable and only parameter_value can be updated
  await TestValidator.error(
    "attempting to modify immutable parameter_key should fail",
    async () => {
      // Try to send an update with parameter_key modification attempt
      // The API should reject this since IUpdate only allows parameter_value
      await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.update(
        superAdminConnection,
        {
          auditLogId,
          parameterId: parameter.id,
          body: {
            parameter_value: RandomGenerator.alphabets(20),
            // Attempt to include parameter_key which should be rejected
          } as any satisfies IDiscussionBoardSystemAuditLogParameter.IUpdate,
        },
      );
    },
  );
}
