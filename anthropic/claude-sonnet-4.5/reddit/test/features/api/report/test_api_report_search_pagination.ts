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

export async function test_api_report_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
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

  // Step 2: Create community
  const community: IRedditCommunityCommunity =
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
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: true,
        show_subscribed_communities: true,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Create 5 posts
  const posts: IRedditCommunityPost[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      const post: IRedditCommunityPost =
        await api.functional.redditCommunity.member.posts.create(connection, {
          body: {
            community_id: community.id,
            title: RandomGenerator.paragraph({ sentences: 1 }),
            post_type: "text",
            body: RandomGenerator.content({ paragraphs: 2 }),
            url: null,
            image_url: null,
          } satisfies IRedditCommunityPost.ICreate,
        });
      typia.assert(post);
      return post;
    },
  );

  // Step 5: Submit 5 reports for the posts
  const reports: IRedditCommunityReport[] = await ArrayUtil.asyncMap(
    posts,
    async (post) => {
      const report: IRedditCommunityReport =
        await api.functional.redditCommunity.member.reports.create(connection, {
          body: {
            content_type: "post",
            target_content_id: post.id,
            reddit_community_community_id: community.id,
            category: RandomGenerator.pick([
              "spam",
              "harassment",
              "hate_speech",
              "misinformation",
              "sexual_content",
            ] as const),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IRedditCommunityReport.ICreate,
        });
      typia.assert(report);
      return report;
    },
  );

  // Step 6: Switch back to moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 7: Search reports with page=1 and limit=2
  const page1: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(page1);

  // Step 8: Validate page 1 response contains exactly 2 reports
  TestValidator.equals(
    "page 1 should contain exactly 2 reports",
    page1.data.length,
    2,
  );

  // Step 9: Verify pagination.current is 1
  TestValidator.equals("current page should be 1", page1.pagination.current, 1);

  // Step 10: Verify pagination.limit is 2
  TestValidator.equals("page limit should be 2", page1.pagination.limit, 2);

  // Step 11: Verify pagination.records is 5 (total reports)
  TestValidator.equals(
    "total records should be 5",
    page1.pagination.records,
    5,
  );

  // Step 12: Verify pagination.pages is 3 (ceiling of 5/2)
  TestValidator.equals("total pages should be 3", page1.pagination.pages, 3);

  // Step 13: Search reports with page=2 and limit=2
  const page2: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        page: 2,
        limit: 2,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(page2);

  // Step 14: Validate page 2 response contains exactly 2 different reports
  TestValidator.equals(
    "page 2 should contain exactly 2 reports",
    page2.data.length,
    2,
  );

  // Step 15: Verify pagination.current is 2
  TestValidator.equals("current page should be 2", page2.pagination.current, 2);

  // Step 16: Verify no overlap between page 1 and page 2 reports
  const page1Ids = page1.data.map((r) => r.id);
  const page2Ids = page2.data.map((r) => r.id);
  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "page 1 and page 2 should have different reports",
    !hasOverlap,
  );

  // Step 17: Search reports with page=3 and limit=2
  const page3: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        page: 3,
        limit: 2,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(page3);

  // Step 18: Validate page 3 response contains 1 report (last page)
  TestValidator.equals(
    "page 3 should contain 1 report (remainder)",
    page3.data.length,
    1,
  );

  // Step 19: Verify pagination.current is 3
  TestValidator.equals("current page should be 3", page3.pagination.current, 3);
}
