import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

/**
 * Test empty result handling when searching for reports with a category that
 * doesn't exist.
 *
 * This test validates that the API correctly returns an empty result set with
 * proper pagination metadata when filtering reports by a category that has no
 * matching reports.
 *
 * Test flow:
 *
 * 1. Create moderator account and community
 * 2. Create member account for reporting
 * 3. Create posts to be reported
 * 4. Create multiple reports with the SAME category (e.g., "spam")
 * 5. Search for reports with a DIFFERENT category (e.g., "copyright") that doesn't
 *    exist
 * 6. Validate empty data array and zero records/pages in pagination metadata
 */
export async function test_api_community_reports_empty_result_handling(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create member account for reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10).toLowerCase(),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // 4. Create posts to be reported
  const posts = await ArrayUtil.asyncRepeat(3, async () => {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text" as const,
          body: RandomGenerator.content({ paragraphs: 2 }),
          url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // 5. Create reports with the SAME category (all "spam" reports)
  const reportCategory = "spam" as const;
  const reports = await ArrayUtil.asyncRepeat(3, async (index) => {
    const report = await api.functional.redditCommunity.member.reports.create(
      connection,
      {
        body: {
          content_type: "post" as const,
          target_content_id: posts[index].id,
          reddit_community_community_id: community.id,
          category: reportCategory,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
    typia.assert(report);
    return report;
  });

  // Verify reports were created with correct category
  TestValidator.equals("should have created 3 reports", reports.length, 3);
  reports.forEach((report, index) => {
    TestValidator.equals(
      `report ${index} should have spam category`,
      report.category,
      reportCategory,
    );
  });

  // 6. Switch to moderator context
  const moderatorLogin = await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });
  typia.assert(moderatorLogin);

  // 7. Search for reports with a DIFFERENT category that doesn't exist
  const nonExistentCategory = "copyright" as const;
  const emptyResult =
    await api.functional.redditCommunity.moderator.communities.reports.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
          category: nonExistentCategory,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(emptyResult);

  // 8. Validate empty result with correct pagination metadata
  TestValidator.equals(
    "data array should be empty",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "records should be zero",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("pages should be zero", emptyResult.pagination.pages, 0);
  TestValidator.predicate(
    "current page should be valid",
    emptyResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be positive",
    emptyResult.pagination.limit > 0,
  );
}
