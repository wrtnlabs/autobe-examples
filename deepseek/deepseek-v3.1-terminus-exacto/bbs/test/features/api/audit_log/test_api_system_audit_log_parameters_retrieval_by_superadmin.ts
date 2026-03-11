import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemAuditLogParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can successfully retrieve filtered audit log parameters
 * associated with a specific system audit log entry for governance oversight purposes.
 */
export async function test_api_system_audit_log_parameters_retrieval_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Generate a valid audit log ID
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test filtering by parameter_key with exact matching
  const parameterKeyFilterTest =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.index(
      superAdminConnection,
      {
        auditLogId,
        body: {
          parameter_key: "field_name",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest,
      },
    );
  typia.assert(parameterKeyFilterTest);
  // 4. Test filtering by parameter_value with partial matching
  const parameterValueFilterTest =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.index(
      superAdminConnection,
      {
        auditLogId,
        body: {
          parameter_value: "old_value",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest,
      },
    );
  typia.assert(parameterValueFilterTest);
  // 5. Test pagination with specific page and limit
  const paginationTest =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.index(
      superAdminConnection,
      {
        auditLogId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest,
      },
    );
  typia.assert(paginationTest);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginationTest.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginationTest.pagination.limit, 10);
  TestValidator.predicate(
    "total records non-negative",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    paginationTest.pagination.pages >= 0,
  );
  // 7. Test empty search parameters (should return all parameters)
  const emptyFilterTest =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.index(
      superAdminConnection,
      {
        auditLogId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest,
      },
    );
  typia.assert(emptyFilterTest);
  // 8. Validate parameter summary structure (business logic validation only)
  if (emptyFilterTest.data.length > 0) {
    const parameter = emptyFilterTest.data[0];
    // Only business logic validation - typia.assert() already handles type validation
    TestValidator.predicate(
      "parameter has non-empty key",
      parameter.parameter_key.length > 0,
    );
    TestValidator.predicate(
      "parameter has valid timestamp",
      parameter.created_at.length > 0,
    );
  }
}
