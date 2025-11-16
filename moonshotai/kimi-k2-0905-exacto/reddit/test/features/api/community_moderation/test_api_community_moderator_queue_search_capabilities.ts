import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationQueue";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityContentReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReportStatus";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueue";
import type { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test the search functionality within the moderation queue that allows
 * moderators to quickly locate specific reports based on report reasoning,
 * violation categories, and related content.
 */
export async function test_api_community_moderator_queue_search_capabilities(
  connection: api.IConnection,
) {
  // 1. Register community moderator account
  const moderatorEmail =
    "moderator" + RandomGenerator.alphabets(5) + "@example.com";
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        nickname: "Moderator" + RandomGenerator.alphabets(5),
        password: "password123",
        href: "https://example.com/moderator",
        referrer: "https://example.com/home",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // 2. Create member accounts for reporting
  const memberEmails = ArrayUtil.repeat(
    3,
    () => RandomGenerator.alphabets(8) + "@example.com",
  );
  const members: IRedditCommunityMember.IAuthorized[] = [];

  // Create member accounts sequentially to avoid conflicts
  for (let i = 0; i < 3; i++) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name(),
        email: memberEmails[i],
        password: "password123",
      } satisfies IRedditCommunityMember.ICreate,
    });
    members.push(member);
  }
  typia.assert(members);

  // 3. Login as first member to create posts
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmails[0],
      password: "password123",
      href: "https://example.com/member",
      referrer: "https://example.com/moderator",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  // Use consistent random UUIDs for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create posts with varied content
  const reportCategories = [
    "harassment",
    "spam",
    "misinformation",
    "hate_speech",
  ] as const;

  const posts: IRedditCommunityPost[] = [];
  for (let i = 0; i < 4; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          reddit_community_id: communityId,
          reddit_post_type_id: postTypeId,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    posts.push(post);
  }
  typia.assert(posts);

  // 5. Create diverse content reports with specific search terms
  const reportReasons = [
    "This post contains offensive language that violates community standards about respectful communication",
    "User spamming irrelevant content about cryptocurrency scams and get-rich-quick schemes",
    "Spreading false information about election procedures and voting processes",
    "Targeted harassment campaign against specific individual using multiple accounts",
  ];

  const reports: IRedditCommunityContentReport[] = [];
  for (let i = 0; i < posts.length; i++) {
    // Switch to appropriate member for each report
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmails[i % memberEmails.length],
        password: "password123",
        href: "https://example.com/member",
        referrer: "https://example.com/home",
      } satisfies IRedditCommunityMember.ILoginRequest,
    });

    const report =
      await api.functional.redditCommunity.member.contentReports.create(
        connection,
        {
          body: {
            report_reason: reportReasons[i],
            report_category: reportCategories[i % reportCategories.length],
            post_id: posts[i].id,
            content_type: "post" as const,
          } satisfies IRedditCommunityContentReport.ICreate,
        },
      );
    reports.push(report);
  }
  typia.assert(reports);

  // 6. Login as moderator to test search functionality
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "password123",
      href: "https://example.com/moderator",
      referrer: "https://example.com/moderator/dashboard",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // 7. Test full-text search across report details
  const searchTerms = [
    { query: "offensive", expectedInReport: 0 },
    { query: "cryptocurrency", expectedInReport: 1 },
    { query: "election", expectedInReport: 2 },
    { query: "harassment", expectedInReport: 3 },
  ];

  for (const { query, expectedInReport } of searchTerms) {
    const searchResult =
      await api.functional.redditCommunity.communityModerator.moderationQueue.index(
        connection,
        {
          body: {
            search_query: query,
            page: 1,
            limit: 10,
          } satisfies IRedditCommunityModerationQueue.IRequest,
        },
      );
    typia.assert(searchResult);

    // Verify search results contain the expected report
    TestValidator.predicate(
      `search query "${query}" returned the expected report`,
      searchResult.data.some(
        (record) => record.content_report.id === reports[expectedInReport].id,
      ),
    );
  }

  // 8. Test category-specific filtering
  for (let i = 0; i < reportCategories.length; i++) {
    const category = reportCategories[i];
    const categoryResult =
      await api.functional.redditCommunity.communityModerator.moderationQueue.index(
        connection,
        {
          body: {
            report_category: category,
            page: 1,
            limit: 10,
          } satisfies IRedditCommunityModerationQueue.IRequest,
        },
      );
    typia.assert(categoryResult);

    if (categoryResult.data.length > 0) {
      TestValidator.predicate(
        `category filter "${category}" returned correct results`,
        categoryResult.data.every(
          (record) => record.content_report.report_category === category,
        ),
      );
    }
  }

  // 9. Test combined search and filter operations
  const combinedSearchResult =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          search_query: "spam",
          report_category: "spam",
          status_filter: "submitted",
          page: 1,
          limit: 5,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(combinedSearchResult);

  // Verify combined filtering works
  if (combinedSearchResult.data.length > 0) {
    TestValidator.predicate(
      "combined search and filter returned results matching all criteria",
      combinedSearchResult.data.every(
        (record) =>
          record.content_report.report_category === "spam" &&
          (record.content_report.report_reason.toLowerCase().includes("spam") ||
            record.content_report.report_category
              .toLowerCase()
              .includes("spam")) &&
          record.content_report.status === "submitted",
      ),
    );
  }

  // 10. Test pagination with search results
  const firstPage =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          search_query: "post",
          page: 1,
          limit: 2,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(firstPage);

  if (firstPage.data.length === 2 && firstPage.pagination.records > 2) {
    const secondPage =
      await api.functional.redditCommunity.communityModerator.moderationQueue.index(
        connection,
        {
          body: {
            search_query: "post",
            page: 2,
            limit: 2,
          } satisfies IRedditCommunityModerationQueue.IRequest,
        },
      );
    typia.assert(secondPage);

    // Verify pagination works correctly
    TestValidator.equals(
      "second page has correct pagination settings",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page has correct limit",
      secondPage.pagination.limit,
      2,
    );

    // Verify pages contain different reports (when total > 2)
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.predicate(
        "first and second pages contain different reports when applicable",
        firstPage.data[0].id !== secondPage.data[0].id,
      );
    }
  }

  // 11. Test empty search results
  const emptySearchResult =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          search_query: "nonexistentsearchterm123456thatshouldnotmatchanything",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns no results",
    emptySearchResult.data.length,
    0,
  );

  // 12. Test that different search terms return different results
  const offensiveResults =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          search_query: "offensive",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );

  const cryptoResults =
    await api.functional.redditCommunity.communityModerator.moderationQueue.index(
      connection,
      {
        body: {
          search_query: "cryptocurrency",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModerationQueue.IRequest,
      },
    );

  // Verify different search queries return potentially different sets
  const offensiveIds = new Set(offensiveResults.data.map((r) => r.id));
  const cryptoIds = new Set(cryptoResults.data.map((r) => r.id));

  TestValidator.predicate(
    "different search queries can return different results",
    !ArrayUtil.has(Array.from(offensiveIds), (id) => cryptoIds.has(id)) ||
      Array.from(offensiveIds).length === 0 ||
      Array.from(cryptoIds).length === 0,
  );
}
