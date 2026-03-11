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
import { generate_random_discussion_board_admin_system_audit_logs_parameters_create } from "../../../generate/generate_random_discussion_board_admin_system_audit_logs_parameters_create";
import { prepare_random_discussion_board_system_audit_log_parameter } from "../../../prepare/prepare_random_discussion_board_system_audit_log_parameter";

/**
 * Test that audit log parameter creation requires proper administrator authorization.
 * Attempt to create an audit log parameter without authentication or with insufficient
 * privileges. Verify the system returns an authorization error response and prevents
 * unauthorized access to audit trail metadata. Validate that security controls properly
 * restrict audit log parameter creation to authorized administrators only.
 */
export async function test_api_system_audit_log_parameter_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid audit log ID for testing
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // Prepare valid parameter creation data
  const parameterBody = {
    parameterKey: RandomGenerator.alphabets(10),
    parameterValue: RandomGenerator.alphabets(15),
  } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate;
  // Test 1: Attempt to create parameter without any authentication
  await TestValidator.error(
    "unauthorized access without authentication",
    async () => {
      await api.functional.discussionBoard.admin.system_audit_logs.parameters.create(
        connection,
        {
          auditLogId,
          body: parameterBody,
        },
      );
    },
  );
  // Test 2: Successful creation with proper admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const parameter =
    await api.functional.discussionBoard.admin.system_audit_logs.parameters.create(
      adminConnection,
      {
        auditLogId,
        body: parameterBody,
      },
    );
  typia.assert(parameter);
  // Validate the created parameter (typia.assert already validated everything)
  TestValidator.equals(
    "parameter key matches",
    parameter.parameter_key,
    parameterBody.parameterKey,
  );
  TestValidator.equals(
    "parameter value matches",
    parameter.parameter_value,
    parameterBody.parameterValue,
  );
  TestValidator.equals(
    "audit log ID matches",
    parameter.system_audit_log_id,
    auditLogId,
  );
}
