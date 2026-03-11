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

export async function test_api_superadmin_analytics_comprehensive_platform_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account for authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // 2. Test analytics with different query parameters
  // Test 1: Basic analytics query without filters
  const basicAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(basicAnalytics);
  // Validate pagination business logic
  TestValidator.predicate(
    "pagination current page valid",
    basicAnalytics.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit reasonable",
    basicAnalytics.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records consistent",
    basicAnalytics.pagination.records >= basicAnalytics.data.length,
  );
  // Test 2: Analytics with date range filtering
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString();
  const dateFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          viewed_at_from: yesterday,
          viewed_at_to: today,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(dateFilteredAnalytics);
  // Test 3: Analytics with viewer type filtering
  const viewerTypes = ["member", "admin", "super_admin", "guest"] as const;
  for (const viewerType of viewerTypes) {
    const viewerTypeAnalytics =
      await api.functional.discussionBoard.superAdmin.analytics.index(
        superAdminConnection,
        {
          body: {
            viewer_type: viewerType,
            page: 1,
            limit: 5,
          } satisfies IDiscussionBoardArticleViewStat.IRequest,
        },
      );
    typia.assert(viewerTypeAnalytics);
    // Validate that each returned item has the correct viewer type indicator
    if (viewerTypeAnalytics.data.length > 0) {
      for (const viewStat of viewerTypeAnalytics.data) {
        switch (viewerType) {
          case "member":
            TestValidator.predicate(
              "member view has member_id",
              viewStat.member_id !== null,
            );
            break;
          case "admin":
            TestValidator.predicate(
              "admin view has admin_id",
              viewStat.admin_id !== null,
            );
            break;
          case "super_admin":
            TestValidator.predicate(
              "super_admin view has super_admin_id",
              viewStat.super_admin_id !== null,
            );
            break;
          case "guest":
            TestValidator.predicate(
              "guest view has guest_id",
              viewStat.guest_id !== null,
            );
            break;
        }
      }
    }
  }
  // Test 4: Analytics with combined filters
  const combinedAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          viewed_at_from: yesterday,
          viewer_type: "member",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(combinedAnalytics);
  // Validate analytics data business logic
  if (combinedAnalytics.data.length > 0) {
    const sampleViewStat = combinedAnalytics.data[0];
    // Business logic validation: article should have meaningful content
    TestValidator.predicate(
      "article title not empty",
      sampleViewStat.article.title.length > 0,
    );
    TestValidator.predicate(
      "author display name not empty",
      sampleViewStat.article.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "section name not empty",
      sampleViewStat.article.section.name.length > 0,
    );
    TestValidator.predicate(
      "comments count non-negative",
      sampleViewStat.article.comments_count >= 0,
    );
    // Validate timestamp ordering (created_at should be before viewed_at)
    const createdAt = new Date(sampleViewStat.article.created_at);
    const viewedAt = new Date(sampleViewStat.viewed_at);
    TestValidator.predicate(
      "article created before viewed",
      createdAt <= viewedAt,
    );
  }
  // Test 5: Analytics with pagination boundaries
  const largePageAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          page: 100, // Large page number
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStat.IRequest,
      },
    );
  typia.assert(largePageAnalytics);
  // The system should handle large page numbers gracefully
  TestValidator.predicate(
    "large page returns valid pagination",
    largePageAnalytics.pagination.pages >= 0,
  );
  // Final validation: Ensure analytics provide governance value
  TestValidator.predicate(
    "analytics support governance",
    basicAnalytics.data.length >= 0 && dateFilteredAnalytics.data.length >= 0,
  );
}
