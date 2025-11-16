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
 * Test date range filtering for reports to help moderators review reports from
 * specific time periods.
 *
 * This test validates that from_date and to_date filters work correctly for
 * time-bound report searches. It creates reports at different timestamps and
 * verifies that date range filters properly include or exclude reports based on
 * their creation times.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator and create community
 * 2. Authenticate as member and create first post with report
 * 3. Wait to ensure timestamp separation
 * 4. Create second post with report at different timestamp
 * 5. Switch to moderator and test various date range filters
 * 6. Verify only appropriate reports appear in each filtered result
 */
export async function test_api_report_search_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator and store password for later login
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Authenticate as member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
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

  // Step 4: Create first post
  const firstPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(firstPost);

  // Step 5: Submit first report
  const firstReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: {
        content_type: "post",
        target_content_id: firstPost.id,
        reddit_community_community_id: community.id,
        category: "spam",
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(firstReport);

  const firstReportTime = new Date(firstReport.created_at);

  // Step 6: Wait to ensure timestamp separation (100ms ensures different timestamps in most systems)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 7: Create second post
  const secondPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(secondPost);

  // Step 8: Submit second report
  const secondReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: {
        content_type: "post",
        target_content_id: secondPost.id,
        reddit_community_community_id: community.id,
        category: "harassment",
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(secondReport);

  const secondReportTime = new Date(secondReport.created_at);

  // Step 9: Switch back to moderator authentication using stored password
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator.email,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 10: Search reports with from_date after first report - should return only second report
  const midpointTime = new Date(
    (firstReportTime.getTime() + secondReportTime.getTime()) / 2,
  );
  const resultsAfterFirst =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        from_date: midpointTime.toISOString(),
        community_name: community.name,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(resultsAfterFirst);

  TestValidator.predicate(
    "search with from_date after first report should return only second report",
    resultsAfterFirst.data.length === 1 &&
      resultsAfterFirst.data[0].id === secondReport.id,
  );

  // Step 11: Search reports with to_date before second report - should return only first report
  const resultsBeforeSecond =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        to_date: midpointTime.toISOString(),
        community_name: community.name,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(resultsBeforeSecond);

  TestValidator.predicate(
    "search with to_date before second report should return only first report",
    resultsBeforeSecond.data.length === 1 &&
      resultsBeforeSecond.data[0].id === firstReport.id,
  );

  // Step 12: Search reports with both from_date and to_date encompassing both reports
  const beforeFirstTime = new Date(firstReportTime.getTime() - 1000);
  const afterSecondTime = new Date(secondReportTime.getTime() + 1000);
  const resultsBothReports =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        from_date: beforeFirstTime.toISOString(),
        to_date: afterSecondTime.toISOString(),
        community_name: community.name,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(resultsBothReports);

  TestValidator.predicate(
    "search with date range encompassing both reports should return both reports",
    resultsBothReports.data.length === 2,
  );
}
