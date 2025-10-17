import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformControversialScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate retrieval of a cached controversial score for a visible comment in a
 * Reddit-like community platform.
 *
 * This business workflow simulates standard, public-facing user content:
 *
 * 1. Register a new user (member)
 * 2. Member creates a public community (subreddit)
 * 3. Member creates a post in that community (type=text, with content)
 * 4. Member creates a root (non-nested) comment on that post
 * 5. Retrieve the cached controversial score for the comment via public API
 * 6. Assert that the score is present, valid, and accessible; ensure the API does
 *    not return not found or forbidden
 */
export async function test_api_comment_controversial_score_retrieval_visible_comment(
  connection: api.IConnection,
) {
  // 1. Register new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          slug: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_body: RandomGenerator.content({ paragraphs: 1 }),
        content_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create a root comment for the post
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. Retrieve the controversial score for the comment
  const score =
    await api.functional.communityPlatform.comments.controversialScore.at(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(score);
  TestValidator.equals(
    "controversial score record is for the expected comment ID",
    score.community_platform_comment_id,
    comment.id,
  );
  TestValidator.predicate(
    "controversial score is a non-negative number",
    typeof score.controversial_score === "number" &&
      score.controversial_score >= 0,
  );
}
