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

export async function test_api_system_audit_log_parameter_super_admin_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator authorization context
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create an audit log parameter to be deleted
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const parameter =
    await generate_random_discussion_board_super_admin_system_audit_logs_parameters_create(
      superAdminConnection,
      {
        params: { auditLogId },
        body: {
          parameterKey: typia.random<string>(),
          parameterValue: typia.random<string>(),
        } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate,
      },
    );
  typia.assert(parameter);
  // 3. Delete the audit log parameter
  await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.erase(
    superAdminConnection,
    {
      auditLogId,
      parameterId: parameter.id,
    },
  );
  // 4. Validate deletion by attempting to delete again (should fail)
  await TestValidator.error(
    "deleted parameter should not be found",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.erase(
        superAdminConnection,
        {
          auditLogId,
          parameterId: parameter.id,
        },
      );
    },
  );
}
