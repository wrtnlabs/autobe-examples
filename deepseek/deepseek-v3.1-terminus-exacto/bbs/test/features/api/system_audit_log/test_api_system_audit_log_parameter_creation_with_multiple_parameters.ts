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

export async function test_api_system_audit_log_parameter_creation_with_multiple_parameters(
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
  // Generate a random audit log ID for testing
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // Create multiple parameters with different key-value pairs
  const parameterKeys = [
    "operation_type",
    "target_id",
    "old_value",
    "new_value",
    "user_role",
  ] as const;
  const createdParameters: IDiscussionBoardSystemAuditLogParameter[] = [];
  for (const key of parameterKeys) {
    const parameter =
      await generate_random_discussion_board_super_admin_system_audit_logs_parameters_create(
        superAdminConnection,
        {
          params: { auditLogId },
          body: {
            parameterKey: key,
            parameterValue: typia.random<string>(),
          } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate,
        },
      );
    typia.assert(parameter);
    createdParameters.push(parameter);
    // Validate parameter was created correctly
    TestValidator.equals(
      `parameter key should be ${key}`,
      parameter.parameter_key,
      key,
    );
    TestValidator.equals(
      "audit log ID should match",
      parameter.system_audit_log_id,
      auditLogId,
    );
    TestValidator.predicate(
      "parameter value should not be empty",
      parameter.parameter_value.length > 0,
    );
  }
  // Verify all parameters have unique IDs
  const parameterIds = createdParameters.map((p) => p.id);
  const uniqueIds = new Set(parameterIds);
  TestValidator.equals(
    "all parameter IDs should be unique",
    parameterIds.length,
    uniqueIds.size,
  );
  // Verify all parameters belong to the same audit log
  const allSameAuditLog = createdParameters.every(
    (p) => p.system_audit_log_id === auditLogId,
  );
  TestValidator.predicate(
    "all parameters should belong to the same audit log",
    allSameAuditLog,
  );
  // Verify parameter keys are distinct
  const createdKeys = createdParameters.map((p) => p.parameter_key);
  const uniqueKeys = new Set(createdKeys);
  TestValidator.equals(
    "all parameter keys should be unique",
    createdKeys.length,
    uniqueKeys.size,
  );
}
