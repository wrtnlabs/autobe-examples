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
 * Test reporting a comment for harassment violations.
 *
 * This test validates the complete workflow of reporting a comment with the
 * harassment category:
 *
 * 1. Moderator creates a community for content context
 * 2. Member 1 creates a post in the community
 * 3. Member 2 creates a comment on that post
 * 4. Member 3 reports the comment using 'harassment' category with description
 * 5. Validates that the report is created with correct category, description,
 *    status 'pending', and all relationships
 */
export async function test_api_comment_report_harassment_category(
  connection: api.IConnection,
) {
  // Step 1: Moderator joins and creates community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 2: Member 1 joins and creates post
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: member1Email,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member1);

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Member 2 joins and creates comment
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: member2Email,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
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
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Member 3 joins and reports the comment with harassment category
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: member3Email,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member3);

  const reportDescription =
    "This comment contains harassing language targeting specific individuals";
  const report =
    await api.functional.redditCommunity.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          content_type: "comment",
          target_content_id: comment.id,
          reddit_community_community_id: community.id,
          category: "harassment",
          description: reportDescription,
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 5: Validate report properties
  TestValidator.equals(
    "report category is harassment",
    report.category,
    "harassment",
  );
  TestValidator.equals(
    "report description preserved",
    report.description,
    reportDescription,
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report content type is comment",
    report.content_type,
    "comment",
  );
  TestValidator.equals(
    "report community ID matches",
    report.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "report member ID matches reporter",
    report.reddit_community_member_id,
    member3.id,
  );
}
