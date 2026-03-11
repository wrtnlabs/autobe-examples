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

export async function test_api_system_audit_log_parameter_creation_by_super_admin(
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
  // Generate a random UUID for the parent audit log
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // Create audit log parameter using utility function
  const parameter =
    await generate_random_discussion_board_super_admin_system_audit_logs_parameters_create(
      superAdminConnection,
      {
        params: { auditLogId },
        body: {
          parameterKey: RandomGenerator.alphabets(10),
          parameterValue: RandomGenerator.alphabets(20),
        } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate,
      },
    );
  // Validate the response - this performs complete type validation
  typia.assert(parameter);
  // Verify business logic: foreign key relationship is correct
  TestValidator.equals(
    "parameter references correct audit log",
    parameter.system_audit_log_id,
    auditLogId,
  );
}
