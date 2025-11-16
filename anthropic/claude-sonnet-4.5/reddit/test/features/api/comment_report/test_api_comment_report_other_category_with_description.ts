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
 * Test reporting a comment with the 'other' category requiring a mandatory
 * description.
 *
 * This test validates the complete workflow of reporting a comment using the
 * 'other' category, which requires a detailed description field. The test
 * creates a multi-actor environment with a moderator, community, post author,
 * commenter, and reporter to simulate a realistic reporting scenario.
 *
 * The test verifies that when category is 'other', the description field is
 * properly captured and stored, allowing the report system to accept custom
 * violation explanations for edge cases not covered by predefined categories.
 *
 * Workflow:
 *
 * 1. Create moderator and community
 * 2. Create post author member and post
 * 3. Create commenter member and comment
 * 4. Create reporter member and submit report with 'other' category
 * 5. Verify report creation with description properly stored
 */
export async function test_api_comment_report_other_category_with_description(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create first member (post author) and authenticate
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: authorEmail,
        password: "author123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(author);

  // Step 4: Post author creates a post in the community
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create second member (commenter) and authenticate
  const commenterEmail = typia.random<string & tags.Format<"email">>();
  const commenter: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: commenterEmail,
        password: "commenter123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(commenter);

  // Step 6: Commenter creates a comment on the post
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 7: Create third member (reporter) and authenticate
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: reporterEmail,
        password: "reporter123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(reporter);

  // Step 8: Reporter submits a report with 'other' category and detailed description
  const reportDescription =
    "This comment contains a unique policy violation that doesn't fit standard categories. " +
    "The commenter is engaging in coordinated inauthentic behavior by posting identical " +
    "content across multiple communities to artificially inflate engagement metrics. " +
    "This violates community guidelines about authentic participation but isn't covered " +
    "by spam, harassment, or other predefined categories.";

  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          content_type: "comment",
          target_content_id: comment.id,
          reddit_community_community_id: community.id,
          category: "other",
          description: reportDescription,
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 9: Validate report business logic properties
  TestValidator.equals(
    "report content type is comment",
    report.content_type,
    "comment",
  );

  TestValidator.equals("report category is other", report.category, "other");

  TestValidator.equals(
    "report description matches provided text",
    report.description,
    reportDescription,
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
}
