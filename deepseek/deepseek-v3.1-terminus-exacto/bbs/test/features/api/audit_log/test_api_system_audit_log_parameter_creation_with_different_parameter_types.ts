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

export async function test_api_system_audit_log_parameter_creation_with_different_parameter_types(
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
  // Generate a random audit log ID (in a real scenario, this would come from an existing audit log)
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // Test different parameter key naming conventions that represent various audit metadata categories
  const parameterTestCases = [
    {
      parameterKey: "field_name",
      parameterValue: RandomGenerator.name(),
    },
    {
      parameterKey: "target_entity_id",
      parameterValue: typia.random<string & tags.Format<"uuid">>(),
    },
    {
      parameterKey: "operation_type",
      parameterValue: "create",
    },
    {
      parameterKey: "system_timestamp",
      parameterValue: new Date().toISOString(),
    },
  ];
  // Create parameters using SDK function (no utility function available)
  for (const testCase of parameterTestCases) {
    const parameter =
      await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.create(
        superAdminConnection,
        {
          auditLogId,
          body: {
            parameterKey: testCase.parameterKey,
            parameterValue: testCase.parameterValue,
          } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate,
        },
      );
    typia.assert(parameter);
    // Validate basic response structure
    TestValidator.equals(
      "parameter key matches",
      parameter.parameter_key,
      testCase.parameterKey,
    );
    TestValidator.equals(
      "parameter value matches",
      parameter.parameter_value,
      testCase.parameterValue,
    );
    TestValidator.equals(
      "audit log ID matches",
      parameter.system_audit_log_id,
      auditLogId,
    );
    TestValidator.predicate(
      "has valid UUID",
      typia.is<string & tags.Format<"uuid">>(parameter.id),
    );
    TestValidator.predicate(
      "has valid created_at timestamp",
      typia.is<string & tags.Format<"date-time">>(parameter.created_at),
    );
    TestValidator.predicate(
      "has valid updated_at timestamp",
      typia.is<string & tags.Format<"date-time">>(parameter.updated_at),
    );
  }
}
