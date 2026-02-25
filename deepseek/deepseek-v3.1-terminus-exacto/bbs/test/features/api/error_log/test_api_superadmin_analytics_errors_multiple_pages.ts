import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_analytics_errors_multiple_pages(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // First call: page 1 with limit 5
  const request1: IDiscussionBoardErrorLog.IRequest = {
    page: 1,
    limit: 5,
  };
  const firstPage =
    await api.functional.discussionBoard.superAdmin.system.analytics.errors.index(
      superAdminConnection,
      { body: request1 },
    );
  typia.assert(firstPage);
  // Navigate through nested pagination structure to reach actual pagination metadata
  const firstPageActualPagination =
    firstPage.pagination.pagination.pagination.pagination;
  const firstPageData = firstPage.data;
  const firstPageIds = new Set(firstPageData.map((item) => item.id));
  TestValidator.equals(
    "first page current page",
    firstPageActualPagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPageActualPagination.limit, 5);
  TestValidator.predicate(
    "first page has valid records",
    firstPageActualPagination.records >= 0,
  );
  TestValidator.predicate(
    "first page has valid pages",
    firstPageActualPagination.pages >= 0,
  );
  // If total pages > 1, test second page
  if (firstPageActualPagination.pages > 1) {
    // Second call: page 2 with same limit
    const request2: IDiscussionBoardErrorLog.IRequest = {
      page: 2,
      limit: 5,
    };
    const secondPage =
      await api.functional.discussionBoard.superAdmin.system.analytics.errors.index(
        superAdminConnection,
        { body: request2 },
      );
    typia.assert(secondPage);
    const secondPageActualPagination =
      secondPage.pagination.pagination.pagination.pagination;
    const secondPageData = secondPage.data;
    const secondPageIds = new Set(secondPageData.map((item) => item.id));
    // Validate pagination metadata consistency
    TestValidator.equals(
      "second page current page",
      secondPageActualPagination.current,
      2,
    );
    TestValidator.equals(
      "page limit consistency",
      secondPageActualPagination.limit,
      firstPageActualPagination.limit,
    );
    TestValidator.equals(
      "total records consistency",
      secondPageActualPagination.records,
      firstPageActualPagination.records,
    );
    TestValidator.equals(
      "total pages consistency",
      secondPageActualPagination.pages,
      firstPageActualPagination.pages,
    );
    // Validate no overlap between pages
    firstPageIds.forEach((id) => {
      TestValidator.predicate(
        "no overlap between pages",
        !secondPageIds.has(id),
      );
    });
    // Validate second page data length
    TestValidator.predicate("second page has data", secondPageData.length > 0);
    // Verify second page may have fewer results if near end
    if (firstPageActualPagination.pages === 2) {
      const totalRecords = firstPageActualPagination.records;
      const firstPageSize = firstPageData.length;
      const secondPageSize = secondPageData.length;
      TestValidator.predicate(
        "second page size reasonable",
        secondPageSize >= 0 && secondPageSize <= firstPageSize,
      );
      TestValidator.equals(
        "total records match sum",
        totalRecords,
        firstPageSize + secondPageSize,
      );
    }
  }
  // Test edge case: page beyond total pages
  if (firstPageActualPagination.pages > 0) {
    const beyondPage = firstPageActualPagination.pages + 1;
    const request3: IDiscussionBoardErrorLog.IRequest = {
      page: beyondPage,
      limit: 5,
    };
    const beyondPageResponse =
      await api.functional.discussionBoard.superAdmin.system.analytics.errors.index(
        superAdminConnection,
        { body: request3 },
      );
    typia.assert(beyondPageResponse);
    const beyondPageActualPagination =
      beyondPageResponse.pagination.pagination.pagination.pagination;
    const beyondPageData = beyondPageResponse.data;
    // Validate empty data array for page beyond total
    TestValidator.equals("beyond page empty data", beyondPageData.length, 0);
    TestValidator.equals(
      "beyond page current page",
      beyondPageActualPagination.current,
      beyondPage,
    );
    TestValidator.equals(
      "beyond page limit same",
      beyondPageActualPagination.limit,
      5,
    );
    TestValidator.equals(
      "beyond page total records same",
      beyondPageActualPagination.records,
      firstPageActualPagination.records,
    );
    TestValidator.equals(
      "beyond page total pages same",
      beyondPageActualPagination.pages,
      firstPageActualPagination.pages,
    );
  }
}
