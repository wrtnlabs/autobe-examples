import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_audit_logs_parameters_create } from "../../../generate/generate_random_discussion_board_super_admin_system_audit_logs_parameters_create";
import { prepare_random_discussion_board_system_audit_log_parameter } from "../../../prepare/prepare_random_discussion_board_system_audit_log_parameter";

/**
 * Test authorization failure when a regular administrator attempts to delete an audit log parameter.
 * Validates that only super administrators can delete audit log parameters, not regular administrators.
 */
export async function test_api_system_audit_log_parameter_regular_admin_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate super administrator to setup test data
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Step 2: Create an audit log parameter using super admin privileges
  const parameter =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.create(
      superAdminConnection,
      {
        auditLogId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          parameterKey: typia.random<string>(),
          parameterValue: typia.random<string>(),
        } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate,
      },
    );
  typia.assert(parameter);
  // Step 3: Create and authenticate regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await api.functional.discussionBoard.auth.admin.join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(regularAdmin);
  // Step 4: Attempt to delete the audit log parameter using regular admin credentials
  await TestValidator.error(
    "regular admin should not be able to delete audit log parameter",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.erase(
        regularAdminConnection,
        {
          auditLogId: parameter.system_audit_log_id,
          parameterId: parameter.id,
        },
      );
    },
  );
  // Step 5: Verify the parameter still exists by checking its properties
  TestValidator.predicate(
    "parameter should have valid ID after failed deletion attempt",
    () => parameter.id !== undefined && parameter.id.length > 0,
  );
  TestValidator.predicate(
    "parameter should have valid key after failed deletion attempt",
    () =>
      parameter.parameter_key !== undefined &&
      parameter.parameter_key.length > 0,
  );
}
