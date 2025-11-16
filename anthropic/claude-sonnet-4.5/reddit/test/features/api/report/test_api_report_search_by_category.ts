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
 * Test report filtering by violation category to help moderators prioritize
 * review based on violation type.
 *
 * This scenario validates that moderators can search reports filtered by
 * specific violation categories such as harassment, hate_speech, spam, etc.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator
 * 2. Create a community for content context
 * 3. Authenticate as member to create multiple posts
 * 4. Create first post for harassment report
 * 5. Create second post for spam report
 * 6. Submit first report with category 'harassment'
 * 7. Submit second report with category 'spam'
 * 8. Authenticate back as moderator
 * 9. Search reports with category filter set to 'harassment'
 * 10. Validate response contains only harassment report
 * 11. Search again with category filter set to 'spam'
 * 12. Validate response contains only spam report
 * 13. Verify category-specific filtering works correctly
 *
 * This test ensures moderators can efficiently filter their report queues by
 * violation type, enabling them to prioritize high-severity violations like
 * harassment or hate_speech over lower-priority issues like spam.
 */
export async function test_api_report_search_by_category(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator1234";
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community for content context
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Authenticate as member to create posts
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member1234";
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: null,
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: "https://example.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Create first post for harassment report
  const harassmentPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: "Post containing harassment content",
        post_type: "text",
        body: "This is a post with harassment content",
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(harassmentPost);

  // Step 5: Create second post for spam report
  const spamPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: "Spam post advertising products",
        post_type: "text",
        body: "Buy now! Special offer! Click here!",
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(spamPost);

  // Step 6: Submit first report with category 'harassment'
  const harassmentReport: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: {
        content_type: "post",
        target_content_id: harassmentPost.id,
        reddit_community_community_id: community.id,
        category: "harassment",
        description: "This post contains harassment and bullying behavior",
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(harassmentReport);

  // Step 7: Submit second report with category 'spam'
  const spamReport: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: {
        content_type: "post",
        target_content_id: spamPost.id,
        reddit_community_community_id: community.id,
        category: "spam",
        description: "This is spam advertising content",
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(spamReport);

  // Step 8: Authenticate back as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 9: Search reports with category filter set to 'harassment'
  const harassmentSearchResult: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 10,
        category: "harassment",
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(harassmentSearchResult);

  // Step 10: Validate response contains only harassment report
  TestValidator.predicate(
    "harassment search should return at least one report",
    harassmentSearchResult.data.length > 0,
  );
  TestValidator.predicate(
    "all returned reports should be harassment category",
    harassmentSearchResult.data.every(
      (report) => report.category === "harassment",
    ),
  );
  const foundHarassmentReport = harassmentSearchResult.data.find(
    (report) => report.id === harassmentReport.id,
  );
  TestValidator.predicate(
    "harassment report should be found in results",
    foundHarassmentReport !== undefined,
  );

  // Step 11: Search again with category filter set to 'spam'
  const spamSearchResult: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 10,
        category: "spam",
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(spamSearchResult);

  // Step 12: Validate response contains only spam report
  TestValidator.predicate(
    "spam search should return at least one report",
    spamSearchResult.data.length > 0,
  );
  TestValidator.predicate(
    "all returned reports should be spam category",
    spamSearchResult.data.every((report) => report.category === "spam"),
  );
  const foundSpamReport = spamSearchResult.data.find(
    (report) => report.id === spamReport.id,
  );
  TestValidator.predicate(
    "spam report should be found in results",
    foundSpamReport !== undefined,
  );

  // Step 13: Verify category-specific filtering works correctly
  TestValidator.predicate(
    "harassment results should not contain spam reports",
    !harassmentSearchResult.data.some((report) => report.id === spamReport.id),
  );
  TestValidator.predicate(
    "spam results should not contain harassment reports",
    !spamSearchResult.data.some((report) => report.id === harassmentReport.id),
  );
}
