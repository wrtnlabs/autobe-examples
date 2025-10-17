import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_comment_restoration_by_admin_across_any_community(
  connection: api.IConnection,
) {
  // 1. Create admin account for platform-wide restoration privileges
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create member account to author the community, post, and comment
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // 3. Member creates a community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8).toLowerCase(),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // 4. Member creates a post in the community
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // 5. Member creates a comment on the post
  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Store original comment data for validation after restoration
  const originalCommentId = comment.id;
  const originalContentText = comment.content_text;
  const originalPostId = comment.reddit_like_post_id;
  const originalDepth = comment.depth;
  const originalVoteScore = comment.vote_score;

  // 6. Admin restores the comment (testing platform-wide privileges)
  // The admin is NOT a moderator of this community, demonstrating platform-wide authority
  const restoredComment =
    await api.functional.redditLike.admin.comments.restore(connection, {
      commentId: comment.id,
    });
  typia.assert(restoredComment);

  // 7. Validate that the comment was successfully restored with all metadata preserved
  TestValidator.equals(
    "restored comment ID matches original",
    restoredComment.id,
    originalCommentId,
  );
  TestValidator.equals(
    "restored comment content preserved",
    restoredComment.content_text,
    originalContentText,
  );
  TestValidator.equals(
    "restored comment post reference preserved",
    restoredComment.reddit_like_post_id,
    originalPostId,
  );
  TestValidator.equals(
    "restored comment depth preserved",
    restoredComment.depth,
    originalDepth,
  );
  TestValidator.equals(
    "restored comment vote score preserved",
    restoredComment.vote_score,
    originalVoteScore,
  );
}
