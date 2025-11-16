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
 * Test the complete workflow of reporting a comment for spam violations.
 *
 * This test validates the end-to-end process of community members reporting
 * comments that violate spam policies. It establishes a realistic multi-actor
 * scenario where a moderator creates a community, one member creates a post,
 * another member comments on that post, and a third member reports the comment
 * as spam with a detailed explanation.
 *
 * The test verifies that:
 *
 * 1. Multiple actors can authenticate and perform role-specific actions
 * 2. Community content hierarchy (community → post → comment) is properly created
 * 3. Comment reports can be successfully submitted with spam categorization
 * 4. The report entity contains correct status, category, and relationship data
 * 5. All contextual information (reporter, community, target comment) is preserved
 */
export async function test_api_comment_report_spam_violation(
  connection: api.IConnection,
) {
  // Step 1: Moderator creates account and community
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: First member joins and creates a post
  const member1 = await api.functional.auth.member.join(connection, {
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
  typia.assert(member1);

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Second member joins and creates a comment
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
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
  typia.assert(member2);

  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 5: Third member joins and reports the comment as spam
  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: false,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(reporter);

  // Step 6: Submit spam report for the comment
  const report =
    await api.functional.redditCommunity.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          content_type: "comment" as const,
          target_content_id: comment.id,
          reddit_community_community_id: community.id,
          category: "spam" as const,
          description:
            "This comment appears to be spam. It contains repeated promotional links to external websites selling counterfeit products, which violates community guidelines on self-promotion and spam content.",
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 7: Validate report properties
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("report category is spam", report.category, "spam");
  TestValidator.equals(
    "report content type is comment",
    report.content_type,
    "comment",
  );
  TestValidator.equals(
    "reporter ID matches authenticated user",
    report.reddit_community_member_id,
    reporter.id,
  );
  TestValidator.equals(
    "community ID matches",
    report.reddit_community_community_id,
    community.id,
  );
  TestValidator.predicate("report has valid ID", report.id.length > 0);
  TestValidator.predicate(
    "report has created timestamp",
    report.created_at.length > 0,
  );
  TestValidator.predicate(
    "report has updated timestamp",
    report.updated_at.length > 0,
  );
}
