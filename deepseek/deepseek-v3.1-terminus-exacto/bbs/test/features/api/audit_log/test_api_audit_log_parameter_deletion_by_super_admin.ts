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
 * Test successful deletion of an audit log parameter by a super administrator.
 * 1. Create a super administrator account
 * 2. Create an audit log parameter
 * 3. Delete the parameter using the erase endpoint
 * 4. Validate that the parameter is permanently removed
 * 5. Verify authorization checks
 */
export async function test_api_audit_log_parameter_deletion_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Verify the admin is actually a super administrator
  TestValidator.equals(
    "admin should be super administrator",
    adminAuth.admin_grade,
    "super" as const,
  );
  // 2. Create an audit log parameter
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const parameter =
    await generate_random_discussion_board_admin_system_audit_logs_parameters_create(
      superAdminConnection,
      {
        params: { auditLogId },
        body: {
          parameterKey: RandomGenerator.alphabets(10),
          parameterValue: RandomGenerator.alphabets(20),
        } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate,
      },
    );
  typia.assert(parameter);
  // 3. Delete the parameter
  await api.functional.discussionBoard.admin.system_audit_logs.parameters.erase(
    superAdminConnection,
    {
      auditLogId,
      parameterId: parameter.id,
    },
  );
  // 4. Validate that the parameter is permanently removed by testing deletion again
  await TestValidator.error(
    "parameter should not exist for second deletion",
    async () => {
      await api.functional.discussionBoard.admin.system_audit_logs.parameters.erase(
        superAdminConnection,
        {
          auditLogId,
          parameterId: parameter.id,
        },
      );
    },
  );
  // 5. Verify authorization checks - test that regular administrators cannot delete parameters
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuth = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdminAuth);
  // Verify the admin is a regular administrator
  TestValidator.equals(
    "admin should be regular administrator",
    regularAdminAuth.admin_grade,
    "regular" as const,
  );
  // Create a new parameter for the authorization test
  const testAuditLogId = typia.random<string & tags.Format<"uuid">>();
  const testParameter =
    await generate_random_discussion_board_admin_system_audit_logs_parameters_create(
      superAdminConnection,
      {
        params: { auditLogId: testAuditLogId },
        body: {
          parameterKey: RandomGenerator.alphabets(10),
          parameterValue: RandomGenerator.alphabets(20),
        } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate,
      },
    );
  typia.assert(testParameter);
  // Test that regular admin cannot delete the parameter
  await TestValidator.error(
    "regular admin should not be able to delete audit log parameters",
    async () => {
      await api.functional.discussionBoard.admin.system_audit_logs.parameters.erase(
        regularAdminConnection,
        {
          auditLogId: testAuditLogId,
          parameterId: testParameter.id,
        },
      );
    },
  );
}
