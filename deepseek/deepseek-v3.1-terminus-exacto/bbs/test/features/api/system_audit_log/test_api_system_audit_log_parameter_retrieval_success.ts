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
 * Test successful retrieval of an audit log parameter by an administrator.
 * This scenario validates that administrators can access specific parameter details
 * from the audit trail for security investigations and compliance reporting.
 */
export async function test_api_system_audit_log_parameter_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Generate a random audit log parameter
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const createdParameter =
    await api.functional.discussionBoard.admin.system_audit_logs.parameters.create(
      adminConnection,
      {
        auditLogId,
        body: {
          parameterKey: RandomGenerator.paragraph({ sentences: 1 }),
          parameterValue: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate,
      },
    );
  typia.assert(createdParameter);
  // Retrieve the parameter using the specific endpoint
  const retrievedParameter =
    await api.functional.discussionBoard.admin.system_audit_logs.parameters.at(
      adminConnection,
      {
        auditLogId,
        parameterId: createdParameter.id,
      },
    );
  typia.assert(retrievedParameter);
  // Validate that the retrieved parameter matches the created parameter
  TestValidator.equals(
    "parameter ID matches",
    retrievedParameter.id,
    createdParameter.id,
  );
  TestValidator.equals(
    "parameter key matches",
    retrievedParameter.parameter_key,
    createdParameter.parameter_key,
  );
  TestValidator.equals(
    "parameter value matches",
    retrievedParameter.parameter_value,
    createdParameter.parameter_value,
  );
  TestValidator.equals(
    "system audit log ID matches",
    retrievedParameter.system_audit_log_id,
    createdParameter.system_audit_log_id,
  );
  TestValidator.equals(
    "created at matches",
    retrievedParameter.created_at,
    createdParameter.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    retrievedParameter.updated_at,
    createdParameter.updated_at,
  );
}
