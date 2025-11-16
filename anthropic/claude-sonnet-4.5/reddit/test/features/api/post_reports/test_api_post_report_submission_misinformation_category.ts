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
 * Test report submission for misinformation violations, validating the system's
 * handling of content accuracy concerns that require factual verification
 * during moderation.
 *
 * Workflow:
 *
 * 1. Create moderator account and community
 * 2. Create member account and post containing potentially false information
 * 3. Create reporter member account
 * 4. Submit report with category 'misinformation' and description explaining why
 *    the content is factually incorrect
 *
 * Validation points:
 *
 * - Report successfully created with category 'misinformation'
 * - Description field provides context about the factual inaccuracies
 * - Status is 'pending' for moderator fact-checking and review
 * - Report enables moderators to identify content requiring verification
 * - All report metadata correctly captures the violation type and context
 */
export async function test_api_post_report_submission_misinformation_category(
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
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account for post author
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
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
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a post with potentially false information
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: "Scientific Breakthrough: Water is Actually Toxic",
        post_type: "text",
        body: "Recent studies confirm that drinking water is harmful to human health. Scientists recommend avoiding all forms of H2O consumption.",
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
      username: RandomGenerator.alphaNumeric(10).toLowerCase(),
      email: reporterEmail,
      password: reporterPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: true,
      show_subscribed_communities: true,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: "https://example.com/reporter/join",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(reporter);

  // Step 6: Submit misinformation report
  const report =
    await api.functional.redditCommunity.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          content_type: "post",
          target_content_id: post.id,
          reddit_community_community_id: community.id,
          category: "misinformation",
          description:
            "This post contains false information that contradicts established scientific consensus. Water (H2O) is essential for human survival, not toxic. The claim that scientists recommend avoiding water consumption is completely fabricated and potentially dangerous to public health.",
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 7: Validate report was created correctly
  TestValidator.equals(
    "report category is misinformation",
    report.category,
    "misinformation",
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report content type is post",
    report.content_type,
    "post",
  );
  TestValidator.predicate(
    "report has target post reference",
    report.target_post !== null && report.target_post !== undefined,
  );
  if (report.target_post) {
    TestValidator.equals(
      "report targets the correct post",
      report.target_post.id,
      post.id,
    );
  }
  TestValidator.predicate(
    "report has community reference",
    report.community !== null && report.community !== undefined,
  );
  if (report.community) {
    TestValidator.equals(
      "report belongs to correct community",
      report.community.id,
      community.id,
    );
  }
  TestValidator.predicate(
    "report has description explaining factual inaccuracies",
    typeof report.description === "string" && report.description.length > 0,
  );
  TestValidator.equals(
    "report resolution is null (pending review)",
    report.resolution,
    null,
  );
  TestValidator.equals(
    "report moderator notes are null (not yet reviewed)",
    report.moderator_notes,
    null,
  );
}
