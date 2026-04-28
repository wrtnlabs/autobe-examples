import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Test retrieving a single comment that has no child replies.
 *
 * Validates the complete comment retrieval flow including member authentication, community creation, subscription, post creation, comment creation, and comment retrieval. Ensures that the leaf-node comment is returned with all required fields populated correctly.
 *
 * Special attention is given to verifying that the comment correctly represents a leaf node in the comment tree with an empty childComments array, that timestamps reflect an unedited comment (updatedAt equals createdAt), and that the voteScore defaults to 0 with deletedAt as null.
 *
 * 1. Member registers and authenticates on the platform.
 * 2. Member creates a community for discussion.
 * 3. Member subscribes to the created community to gain posting privileges.
 * 4. Member creates a post in the subscribed community.
 * 5. Member creates a top-level comment on the post (no parent reply).
 * 6. Comment is retrieved by postId and commentId via the GET endpoint.
 * 7. Validates comment identity, author summary, post summary, timestamps, voteScore, deletedAt, and empty childComments array.
 */
export async function test_api_comment_retrieval_with_no_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorizedMember);
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe member to community (required for post creation)
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create post in the subscribed community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Create a top-level comment (no parentCommentId = leaf node)
  const commentBody = RandomGenerator.paragraph({ sentences: 3 });
  const createdComment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        body: { body: commentBody },
        params: { postId: post.id },
      },
    );
  typia.assert(createdComment);
  // 6. Retrieve the comment by postId and commentId
  const retrievedComment =
    await api.functional.redditLikeCommunity.member.posts.comments.at(
      memberConnection,
      {
        postId: post.id,
        commentId: createdComment.id,
      },
    );
  typia.assert(retrievedComment);
  // 7. Validate comment identity
  TestValidator.equals(
    "comment id matches",
    retrievedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "comment body matches",
    retrievedComment.body,
    commentBody,
  );
  // 8. Validate author member summary
  TestValidator.equals(
    "author member id matches",
    retrievedComment.author.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "author username matches",
    retrievedComment.author.username,
    authorizedMember.username,
  );
  TestValidator.equals(
    "author email matches",
    retrievedComment.author.email,
    authorizedMember.email,
  );
  TestValidator.predicate(
    "author has created_at",
    retrievedComment.author.created_at !== undefined &&
      retrievedComment.author.created_at !== null,
  );
  // 9. Validate post summary
  TestValidator.equals("post id matches", retrievedComment.post.id, post.id);
  TestValidator.equals(
    "post title matches",
    retrievedComment.post.title,
    post.title,
  );
  TestValidator.equals(
    "post type is text",
    retrievedComment.post.post_type,
    "text",
  );
  TestValidator.equals(
    "post community id matches",
    retrievedComment.post.community.id,
    community.id,
  );
  TestValidator.predicate(
    "post vote score is integer",
    typeof retrievedComment.post.vote_score === "number",
  );
  // 10. Validate comment timestamps - updatedAt should match createdAt for unedited comment
  TestValidator.predicate(
    "createdAt is valid ISO date-time",
    retrievedComment.createdAt !== undefined &&
      retrievedComment.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt is valid ISO date-time",
    retrievedComment.updatedAt !== undefined &&
      retrievedComment.updatedAt !== null,
  );
  TestValidator.equals(
    "updatedAt matches createdAt for unedited comment",
    retrievedComment.updatedAt,
    retrievedComment.createdAt,
  );
  // 11. Validate engagement and status fields
  TestValidator.equals(
    "voteScore is 0 for no votes",
    retrievedComment.voteScore,
    0,
  );
  TestValidator.equals(
    "deletedAt is null for active comment",
    retrievedComment.deletedAt,
    null,
  );
  // 12. Validate leaf node - childComments should be empty array
  TestValidator.equals(
    "childComments is empty array for leaf node",
    retrievedComment.childComments.length,
    0,
  );
}
