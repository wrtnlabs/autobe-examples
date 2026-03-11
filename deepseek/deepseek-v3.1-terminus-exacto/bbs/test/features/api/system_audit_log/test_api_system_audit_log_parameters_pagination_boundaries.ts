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

export async function test_api_system_audit_log_parameters_pagination_boundaries(
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
  // Generate a random audit log ID for testing
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: First page with default limit
  const firstPage =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.index(
      superAdminConnection,
      {
        auditLogId,
        body: {
          page: 1,
        } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest,
      },
    );
  typia.assert(firstPage);
  // Test 2: Minimum limit (1)
  const minLimitPage =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.index(
      superAdminConnection,
      {
        auditLogId,
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest,
      },
    );
  typia.assert(minLimitPage);
  TestValidator.equals("minimum limit", minLimitPage.pagination.limit, 1);
  // Test 3: Maximum limit (100)
  const maxLimitPage =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.index(
      superAdminConnection,
      {
        auditLogId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals("maximum limit", maxLimitPage.pagination.limit, 100);
  // Test 4: Middle page
  const middlePage =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.index(
      superAdminConnection,
      {
        auditLogId,
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest,
      },
    );
  typia.assert(middlePage);
  TestValidator.equals("middle page current", middlePage.pagination.current, 2);
  // Test 5: Last page
  const lastPage =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.index(
      superAdminConnection,
      {
        auditLogId,
        body: {
          page: firstPage.pagination.pages,
          limit: 10,
        } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.predicate(
    "last page data length <= limit",
    lastPage.data.length <= 10,
  );
  // Test 6: Page beyond total records (should return empty data)
  const beyondPage =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.index(
      superAdminConnection,
      {
        auditLogId,
        body: {
          page: 999,
          limit: 10,
        } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page data empty", beyondPage.data.length, 0);
  TestValidator.equals(
    "beyond page current",
    beyondPage.pagination.current,
    999,
  );
  // Test 7: Changing limit affects page count
  const limit10Page =
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
  typia.assert(limit10Page);
  const limit20Page =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.index(
      superAdminConnection,
      {
        auditLogId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest,
      },
    );
  typia.assert(limit20Page);
  // Test pagination metadata consistency
  TestValidator.predicate(
    "records consistent",
    limit10Page.pagination.records === limit20Page.pagination.records,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    limit10Page.pagination.pages ===
      Math.ceil(limit10Page.pagination.records / limit10Page.pagination.limit),
  );
  TestValidator.predicate(
    "20-limit pages <= 10-limit pages",
    limit20Page.pagination.pages <= limit10Page.pagination.pages,
  );
  // Test 8: Filter with no matching results (zero records)
  const noMatchPage =
    await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.index(
      superAdminConnection,
      {
        auditLogId,
        body: {
          parameter_key: "non_existent_key_" + RandomGenerator.alphaNumeric(10),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemAuditLogParameter.IRequest,
      },
    );
  typia.assert(noMatchPage);
  TestValidator.equals(
    "no match records zero",
    noMatchPage.pagination.records,
    0,
  );
  TestValidator.equals("no match pages zero", noMatchPage.pagination.pages, 0);
  TestValidator.equals("no match data empty", noMatchPage.data.length, 0);
  // Test 9: Data array length validation
  TestValidator.predicate(
    "data length <= limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "data length valid for page position",
    firstPage.data.length ===
      Math.min(firstPage.pagination.limit, firstPage.pagination.records),
  );
}
