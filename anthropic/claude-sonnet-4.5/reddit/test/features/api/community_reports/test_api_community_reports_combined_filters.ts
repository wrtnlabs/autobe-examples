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
 * Test combined filters for community reports search.
 *
 * This test validates that the report search API correctly applies multiple
 * filters simultaneously using AND logic. The test creates a diverse set of
 * reports with varying attributes and then searches for reports matching all
 * filter criteria: pending status AND harassment category AND specific date
 * range.
 *
 * Test steps:
 *
 * 1. Create moderator account and community
 * 2. Create multiple member accounts
 * 3. Create diverse posts for reporting
 * 4. Submit reports with various categories and timestamps
 * 5. Search with combined filters (status + category + date range)
 * 6. Validate that only reports matching ALL criteria are returned
 */
export async function test_api_community_reports_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        nickname: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://example.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName = RandomGenerator.alphaNumeric(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple member accounts
  const memberCount = 3;
  const members: IRedditCommunityGuest.IAuthorized[] =
    await ArrayUtil.asyncRepeat(memberCount, async () => {
      const memberEmail = typia.random<string & tags.Format<"email">>();
      const member: IRedditCommunityGuest.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: {
            username: RandomGenerator.alphaNumeric(8),
            email: memberEmail,
            password: "member123",
            ip: "127.0.0.1",
            href: "https://example.com/member/join" satisfies string &
              tags.Format<"uri">,
            referrer: "https://example.com" satisfies string &
              tags.Format<"uri">,
          } satisfies IRedditCommunityGuest.ICreate,
        });
      typia.assert(member);
      return member;
    });

  // Step 4: Create diverse posts
  const posts: IRedditCommunityPost[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      const randomMember = RandomGenerator.pick(members);
      await api.functional.auth.member.login(connection, {
        body: {
          email: randomMember.email,
          password: "member123",
          ip: "127.0.0.1",
          href: "https://example.com/member/login" satisfies string &
            tags.Format<"uri">,
          referrer: "https://example.com" satisfies string & tags.Format<"uri">,
        } satisfies IRedditCommunityGuest.ILogin,
      });

      const post: IRedditCommunityPost =
        await api.functional.redditCommunity.member.posts.create(connection, {
          body: {
            community_id: community.id,
            title: RandomGenerator.paragraph({ sentences: 1 }),
            post_type: "text",
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies IRedditCommunityPost.ICreate,
        });
      typia.assert(post);
      return post;
    },
  );

  // Step 5: Create reports with diverse attributes
  const now = new Date();
  const baseTime = now.getTime();

  // Create reports at different times with different categories
  const reports: IRedditCommunityReport[] = [];

  // Report 1: harassment, created recently (should match filters)
  const member1 = members[0];
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1.email,
      password: "member123",
      ip: "127.0.0.1",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const report1: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: {
        content_type: "post",
        target_content_id: posts[0].id,
        reddit_community_community_id: community.id,
        category: "harassment",
        description: "This is harassment content",
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(report1);
  reports.push(report1);

  // Report 2: spam, created recently (should NOT match - wrong category)
  const member2 = members[1];
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2.email,
      password: "member123",
      ip: "127.0.0.1",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const report2: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: {
        content_type: "post",
        target_content_id: posts[1].id,
        reddit_community_community_id: community.id,
        category: "spam",
        description: "This is spam content",
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(report2);
  reports.push(report2);

  // Report 3: harassment, created recently (should match filters)
  const member3 = members[2];
  await api.functional.auth.member.login(connection, {
    body: {
      email: member3.email,
      password: "member123",
      ip: "127.0.0.1",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const report3: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: {
        content_type: "post",
        target_content_id: posts[2].id,
        reddit_community_community_id: community.id,
        category: "harassment",
        description: "Another harassment report",
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(report3);
  reports.push(report3);

  // Report 4: hate_speech, created recently (should NOT match - wrong category)
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1.email,
      password: "member123",
      ip: "127.0.0.1",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const report4: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: {
        content_type: "post",
        target_content_id: posts[3].id,
        reddit_community_community_id: community.id,
        category: "hate_speech",
        description: "Hate speech content",
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(report4);
  reports.push(report4);

  // Step 6: Switch to moderator and search with combined filters
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Calculate date range (last 7 days to now)
  const fromDate = new Date(baseTime - 7 * 24 * 60 * 60 * 1000);
  const toDate = new Date(baseTime + 1000);

  // Search with combined filters: pending status + harassment category + date range
  const searchResult: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.communities.reports.index(
      connection,
      {
        communityName: communityName,
        body: {
          status: "pending",
          category: "harassment",
          from_date: fromDate.toISOString() satisfies string &
            tags.Format<"date-time">,
          to_date: toDate.toISOString() satisfies string &
            tags.Format<"date-time">,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(searchResult);

  // Step 7: Validate results match ALL filter criteria
  TestValidator.predicate(
    "search should return results",
    searchResult.data.length > 0,
  );

  // All returned reports should be pending status
  for (const report of searchResult.data) {
    TestValidator.equals(
      "report status should be pending",
      report.status,
      "pending",
    );
  }

  // All returned reports should be harassment category
  for (const report of searchResult.data) {
    TestValidator.equals(
      "report category should be harassment",
      report.category,
      "harassment",
    );
  }

  // All returned reports should be within date range
  for (const report of searchResult.data) {
    const reportDate = new Date(report.created_at);
    TestValidator.predicate(
      "report should be within date range",
      reportDate >= fromDate && reportDate <= toDate,
    );
  }

  // Verify that harassment reports are included
  const harassmentReportIds = [report1.id, report3.id];
  const returnedIds = searchResult.data.map((r) => r.id);

  TestValidator.predicate(
    "should include harassment reports",
    harassmentReportIds.some((id) => returnedIds.includes(id)),
  );

  // Verify that non-harassment reports are NOT included
  const nonHarassmentIds = [report2.id, report4.id];
  TestValidator.predicate(
    "should exclude non-harassment reports",
    !nonHarassmentIds.some((id) => returnedIds.includes(id)),
  );

  // Verify pagination metadata
  TestValidator.predicate(
    "pagination should have valid structure",
    searchResult.pagination.current >= 0 &&
      searchResult.pagination.records >= 0 &&
      searchResult.pagination.pages >= 0,
  );
}
