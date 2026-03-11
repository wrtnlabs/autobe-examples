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

export async function test_api_audit_log_parameter_deletion_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // Create a regular administrator connection
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create an audit log parameter
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const parameter =
    await generate_random_discussion_board_admin_system_audit_logs_parameters_create(
      regularAdminConnection,
      {
        params: { auditLogId },
        body: {
          parameterKey: RandomGenerator.paragraph({ sentences: 1 }),
          parameterValue: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate,
      },
    );
  typia.assert(parameter);
  // Attempt to delete the parameter with regular admin (should fail with authorization error)
  await TestValidator.httpError(
    "regular admin should not be able to delete audit log parameter",
    403, // Forbidden - authorization failure
    async () => {
      await api.functional.discussionBoard.admin.system_audit_logs.parameters.erase(
        regularAdminConnection,
        {
          auditLogId,
          parameterId: parameter.id,
        },
      );
    },
  );
}
