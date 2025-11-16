import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

/**
 * Test report submission using 'harassment' category.
 *
 * Validates the system's ability to process serious violation reports that may
 * require urgent moderator attention. This test ensures harassment reports are
 * properly captured and routed to moderation teams for swift action.
 *
 * Workflow:
 *
 * 1. Create moderator account and community
 * 2. Create member account and post containing potentially harassing content
 * 3. Create reporter member account
 * 4. Submit report with category 'harassment' and optional description
 *
 * Validation points:
 *
 * - Report successfully created with category 'harassment'
 * - Status is 'pending' for moderator review
 * - Category correctly identifies the serious nature of the violation
 * - Report is added to moderation queue
 * - All report relationships are correctly established
 * - Created_at timestamp enables tracking for SLA monitoring
 */
export async function test_api_post_report_submission_harassment_category(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

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

  // Step 3: Create first member (post author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = typia.random<string & tags.MinLength<8>>();

  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: authorEmail,
      password: authorPassword,
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
  typia.assert(author);

  // Step 4: Create post with potentially harassing content
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

  // Step 5: Create reporter member account
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = typia.random<string & tags.MinLength<8>>();

  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: reporterEmail,
      password: reporterPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      avatar_url: null,
      show_online_status: true,
      show_subscribed_communities: true,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(reporter);

  // Step 6: Submit harassment report
  const report =
    await api.functional.redditCommunity.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          content_type: "post",
          target_content_id: post.id,
          reddit_community_community_id: community.id,
          category: "harassment",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 7: Validate report properties
  TestValidator.equals(
    "report category is harassment",
    report.category,
    "harassment",
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report community ID matches",
    report.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "report member ID matches reporter",
    report.reddit_community_member_id,
    reporter.id,
  );
  TestValidator.predicate("report has creation timestamp", !!report.created_at);
  TestValidator.predicate(
    "report has no resolution yet",
    report.resolution === null || report.resolution === undefined,
  );
}
