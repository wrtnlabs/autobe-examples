import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_audit_reports_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResponse);
  // Test minimum page limit (1)
  const page1 =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 current page",
    page1.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit",
    page1.pagination.pagination.pagination.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "page 1 records non-negative",
    page1.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1.pagination.pagination.pagination.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 data length consistent",
    page1.data.length <=
      page1.pagination.pagination.pagination.pagination.limit,
  );
  // Test maximum page limit (100)
  const pageMaxLimit =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(pageMaxLimit);
  TestValidator.equals(
    "max limit page current page",
    pageMaxLimit.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit page limit",
    pageMaxLimit.pagination.pagination.pagination.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit records non-negative",
    pageMaxLimit.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "max limit pages non-negative",
    pageMaxLimit.pagination.pagination.pagination.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "max limit data length consistent",
    pageMaxLimit.data.length <=
      pageMaxLimit.pagination.pagination.pagination.pagination.limit,
  );
  // Validate pagination calculations
  if (page1.pagination.pagination.pagination.pagination.records > 0) {
    const expectedPages = Math.ceil(
      page1.pagination.pagination.pagination.pagination.records /
        page1.pagination.pagination.pagination.pagination.limit,
    );
    TestValidator.equals(
      "pagination calculation",
      page1.pagination.pagination.pagination.pagination.pages,
      expectedPages,
    );
  }
  // Test boundary conditions
  if (page1.pagination.pagination.pagination.pagination.pages > 0) {
    // Test last page
    const lastPage =
      await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
        superAdminConnection,
        {
          body: {
            page: page1.pagination.pagination.pagination.pagination.pages,
            limit: 10,
          } satisfies IDiscussionBoardAuditLog.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current page",
      lastPage.pagination.pagination.pagination.pagination.current,
      page1.pagination.pagination.pagination.pagination.pages,
    );
    TestValidator.equals(
      "last page limit",
      lastPage.pagination.pagination.pagination.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "last page records match",
      lastPage.pagination.pagination.pagination.pagination.records ===
        page1.pagination.pagination.pagination.pagination.records,
    );
    TestValidator.predicate(
      "last page pages match",
      lastPage.pagination.pagination.pagination.pagination.pages ===
        page1.pagination.pagination.pagination.pagination.pages,
    );
    TestValidator.predicate(
      "last page data length consistent",
      lastPage.data.length <=
        lastPage.pagination.pagination.pagination.pagination.limit,
    );
    // Test page beyond total pages (should handle gracefully)
    const beyondPage =
      await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
        superAdminConnection,
        {
          body: {
            page: page1.pagination.pagination.pagination.pagination.pages + 1,
            limit: 10,
          } satisfies IDiscussionBoardAuditLog.IRequest,
        },
      );
    typia.assert(beyondPage);
    TestValidator.predicate(
      "beyond page has empty data",
      beyondPage.data.length === 0,
    );
    TestValidator.equals(
      "beyond page current page",
      beyondPage.pagination.pagination.pagination.pagination.current,
      page1.pagination.pagination.pagination.pagination.pages + 1,
    );
    TestValidator.equals(
      "beyond page limit",
      beyondPage.pagination.pagination.pagination.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "beyond page records match",
      beyondPage.pagination.pagination.pagination.pagination.records ===
        page1.pagination.pagination.pagination.pagination.records,
    );
    TestValidator.predicate(
      "beyond page pages match",
      beyondPage.pagination.pagination.pagination.pagination.pages ===
        page1.pagination.pagination.pagination.pagination.pages,
    );
  }
  // Test with empty result set using future date filter
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in future
  const emptyResult =
    await api.functional.discussionBoard.superAdmin.system.reports.audit.index(
      superAdminConnection,
      {
        body: {
          created_at_start: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "empty result has empty data",
    emptyResult.data.length === 0,
  );
  TestValidator.equals(
    "empty result current page",
    emptyResult.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result limit",
    emptyResult.pagination.pagination.pagination.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.pagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages",
    emptyResult.pagination.pagination.pagination.pagination.pages,
    0,
  );
}
