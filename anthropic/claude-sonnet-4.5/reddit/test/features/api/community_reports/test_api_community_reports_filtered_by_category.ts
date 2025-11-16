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
 * Test filtering community reports by violation category.
 *
 * This test validates the category filtering functionality of the community
 * moderation system. It creates a complete test scenario with multiple actors
 * (moderator and member), sets up a community, creates posts, generates reports
 * with different violation categories, and then validates that category-based
 * filtering returns only the matching reports.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a test community
 * 3. Create member account and authenticate
 * 4. Create multiple posts to be reported
 * 5. Create reports with different categories (spam, harassment, hate_speech,
 *    misinformation)
 * 6. Switch back to moderator account
 * 7. Filter reports by "harassment" category
 * 8. Validate that only harassment reports are returned
 * 9. Verify pagination works correctly with filtered results
 */
export async function test_api_community_reports_filtered_by_category(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123";

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

  // Step 2: Create a test community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: true,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create multiple posts to be reported
  const posts = await ArrayUtil.asyncRepeat(4, async () => {
    const post = await api.functional.redditCommunity.member.posts.create(
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
    typia.assert(post);
    return post;
  });

  // Step 5: Create reports with different categories
  const categories = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
  ] as const;
  const createdReports = await ArrayUtil.asyncRepeat(4, async (index) => {
    const report = await api.functional.redditCommunity.member.reports.create(
      connection,
      {
        body: {
          content_type: "post",
          target_content_id: posts[index].id,
          reddit_community_community_id: community.id,
          category: categories[index],
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
    typia.assert(report);
    return report;
  });

  // Step 6: Switch back to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 7: Filter reports by "harassment" category
  const filteredReports =
    await api.functional.redditCommunity.moderator.communities.reports.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
          category: "harassment",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(filteredReports);

  // Step 8: Validate that only harassment reports are returned
  TestValidator.equals(
    "filtered reports should contain exactly 1 harassment report",
    filteredReports.data.length,
    1,
  );

  TestValidator.equals(
    "all returned reports should have harassment category",
    filteredReports.data[0].category,
    "harassment",
  );

  // Step 9: Verify pagination metadata
  TestValidator.equals(
    "pagination total records should be 1",
    filteredReports.pagination.records,
    1,
  );

  TestValidator.equals(
    "pagination total pages should be 1",
    filteredReports.pagination.pages,
    1,
  );

  // Additional validation: Verify the harassment report ID matches what we created
  const harassmentReport = createdReports[1];
  TestValidator.equals(
    "returned report ID should match created harassment report",
    filteredReports.data[0].id,
    harassmentReport.id,
  );
}
