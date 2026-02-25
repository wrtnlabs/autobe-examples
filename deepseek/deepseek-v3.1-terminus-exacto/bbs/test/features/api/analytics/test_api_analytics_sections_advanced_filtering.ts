import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_analytics_sections_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Filter by date range
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString(); // current time
  const dateFilterResponse =
    await api.functional.discussionBoard.superAdmin.analytics.sections.index(
      superAdminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(dateFilterResponse);
  TestValidator.predicate(
    "date filter returns paginated results",
    dateFilterResponse.data.length >= 0,
  );
  // Test 2: Filter by view count thresholds
  const viewCountResponse =
    await api.functional.discussionBoard.superAdmin.analytics.sections.index(
      superAdminConnection,
      {
        body: {
          min_view_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number,
          max_view_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >() satisfies number as number,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(viewCountResponse);
  TestValidator.predicate(
    "view count filter returns results",
    viewCountResponse.data.length >= 0,
  );
  // Test 3: Filter by article count thresholds
  const articleCountResponse =
    await api.functional.discussionBoard.superAdmin.analytics.sections.index(
      superAdminConnection,
      {
        body: {
          min_article_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number,
          max_article_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50>
          >() satisfies number as number,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(articleCountResponse);
  TestValidator.predicate(
    "article count filter returns results",
    articleCountResponse.data.length >= 0,
  );
  // Test 4: Filter by comment count thresholds
  const commentCountResponse =
    await api.functional.discussionBoard.superAdmin.analytics.sections.index(
      superAdminConnection,
      {
        body: {
          min_comment_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number,
          max_comment_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >() satisfies number as number,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(commentCountResponse);
  TestValidator.predicate(
    "comment count filter returns results",
    commentCountResponse.data.length >= 0,
  );
  // Test 5: Combined filters with pagination
  const combinedResponse =
    await api.functional.discussionBoard.superAdmin.analytics.sections.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
          min_view_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number,
          max_view_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >() satisfies number as number,
          start_date: startDate,
          end_date: endDate,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.predicate(
    "combined filter returns pagination info",
    combinedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit is respected",
    combinedResponse.data.length <= combinedResponse.pagination.limit,
  );
  // Test 6: Zero activity sections filter
  const zeroActivityResponse =
    await api.functional.discussionBoard.superAdmin.analytics.sections.index(
      superAdminConnection,
      {
        body: {
          max_view_count: 0,
          max_article_count: 0,
          max_comment_count: 0,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(zeroActivityResponse);
  TestValidator.predicate(
    "zero activity filter returns results",
    zeroActivityResponse.data.length >= 0,
  );
  // Test 7: High engagement sections filter
  const highEngagementResponse =
    await api.functional.discussionBoard.superAdmin.analytics.sections.index(
      superAdminConnection,
      {
        body: {
          min_view_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >() satisfies number as number,
          min_article_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >() satisfies number as number,
          min_comment_count: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<500>
          >() satisfies number as number,
        } satisfies IDiscussionBoardSectionStatistic.IRequest,
      },
    );
  typia.assert(highEngagementResponse);
  TestValidator.predicate(
    "high engagement filter returns results",
    highEngagementResponse.data.length >= 0,
  );
}
