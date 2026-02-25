import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination functionality at various boundary conditions for admin analytics.
 * Tests page 1 with small limits, middle pages, final page, edge cases (page beyond
 * total records), maximum limit values, and sorting parameters.
 */
export async function test_api_admin_analytics_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Test page 1 with small limits
  const page1Limit1 =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(page1Limit1);
  // Access pagination through type assertion
  const pagination = page1Limit1.pagination as any;
  const page1Limit5 =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(page1Limit5);
  const page1Limit10 =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(page1Limit10);
  // 3. Test middle pages with standard limits
  const page2Limit20 =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(page2Limit20);
  // 4. Test final page with varying record counts
  if (pagination.pages > 0) {
    const finalPageSmallLimit =
      await api.functional.discussionBoard.admin.analytics.index(
        adminConnection,
        {
          body: {
            page: pagination.pages,
            limit: 1,
          } satisfies IDiscussionBoardPerformanceMetric.IRequest,
        },
      );
    typia.assert(finalPageSmallLimit);
    TestValidator.equals(
      "final page current page",
      (finalPageSmallLimit.pagination as any).current,
      pagination.pages,
    );
  }
  // 5. Test edge cases
  // Page beyond total records should handle gracefully (should return last page)
  if (pagination.pages > 0) {
    const beyondTotalPages = pagination.pages + 10;
    const beyondPageRequest =
      await api.functional.discussionBoard.admin.analytics.index(
        adminConnection,
        {
          body: {
            page: beyondTotalPages,
            limit: 10,
          } satisfies IDiscussionBoardPerformanceMetric.IRequest,
        },
      );
    typia.assert(beyondPageRequest);
    TestValidator.equals(
      "beyond total pages returns last page",
      (beyondPageRequest.pagination as any).current,
      pagination.pages,
    );
  }
  // 6. Test maximum limit values
  const maxLimitRequest =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(maxLimitRequest);
  // 7. Test sorting parameters
  const ascSort = await api.functional.discussionBoard.admin.analytics.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "asc",
      } satisfies IDiscussionBoardPerformanceMetric.IRequest,
    },
  );
  typia.assert(ascSort);
  const descSort = await api.functional.discussionBoard.admin.analytics.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "desc",
      } satisfies IDiscussionBoardPerformanceMetric.IRequest,
    },
  );
  typia.assert(descSort);
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "total records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count non-negative",
    pagination.pages >= 0,
  );
  if (pagination.pages > 0) {
    TestValidator.predicate(
      "current page within bounds",
      pagination.current >= 1 &&
        pagination.current <= pagination.pages,
    );
  }
}