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

export async function test_api_system_audit_log_parameter_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Note: Since we don't have an API to create audit logs directly,
  // we'll use a randomly generated UUID as the scenario requires
  // This tests the parameter creation endpoint's validation of the auditLogId
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // Create a valid audit log parameter with meaningful key-value pairs
  const parameterBody = {
    parameterKey: "operation_type",
    parameterValue: "user_ban",
  } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate;
  const parameter =
    await generate_random_discussion_board_admin_system_audit_logs_parameters_create(
      adminConnection,
      {
        body: parameterBody,
        params: { auditLogId },
      },
    );
  typia.assert(parameter);
  // Validate parameter key-value data matches input
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
  // Validate foreign key relationship
  TestValidator.equals(
    "system_audit_log_id matches parent",
    parameter.system_audit_log_id,
    auditLogId,
  );
  // Validate business logic: timestamps should be recent
  const createdAt = new Date(parameter.created_at);
  const updatedAt = new Date(parameter.updated_at);
  const now = new Date();
  TestValidator.predicate(
    "created_at is recent",
    now.getTime() - createdAt.getTime() < 60000,
  ); // within 1 minute
  TestValidator.predicate(
    "updated_at is recent",
    now.getTime() - updatedAt.getTime() < 60000,
  ); // within 1 minute
}
