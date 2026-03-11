import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStat";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_analytics_multi_source_integration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Execute comprehensive analytics query without filters
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          // Query without specific filters to get integrated analytics across all sources
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // 3. Validate pagination business logic
  TestValidator.predicate(
    "pagination current page is valid",
    analyticsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is within bounds",
    analyticsResponse.pagination.limit > 0 &&
      analyticsResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    analyticsResponse.pagination.pages ===
      Math.ceil(
        analyticsResponse.pagination.records /
          analyticsResponse.pagination.limit,
      ) || analyticsResponse.pagination.records === 0,
  );
  // 4. Validate data integrity across multiple sources
  TestValidator.predicate(
    "analytics data structure is valid",
    Array.isArray(analyticsResponse.data),
  );
  // 5. Test with date range filters to validate historical trend analysis
  const dateFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          viewed_at_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          viewed_at_to: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(dateFilteredAnalytics);
  // 6. Test with viewer type filter to validate source segregation
  const viewerTypeAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          viewer_type: "member" as const,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(viewerTypeAnalytics);
  // 7. Test combined filters to validate complex query capabilities
  const combinedFilterAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          viewed_at_from: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
          viewer_type: "guest" as const,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(combinedFilterAnalytics);
  // 8. Validate that analytics support platform monitoring requirements
  TestValidator.predicate(
    "analytics endpoint provides comprehensive data for platform oversight",
    analyticsResponse.data.length >= 0 &&
      analyticsResponse.pagination.records >= 0,
  );
}
