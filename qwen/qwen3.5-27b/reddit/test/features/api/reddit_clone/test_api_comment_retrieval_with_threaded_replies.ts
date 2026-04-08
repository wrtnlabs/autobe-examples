import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving a specific comment from a user's profile page with complete threaded structure.
 *
 * Validates the complete comment retrieval workflow including member account creation, community subscription, post creation, and comment threading. Ensures that the retrieved comment contains accurate author information, post context, vote scores, reply counts, and proper threading structure with parent comment references.
 *
 * Special attention is given to verifying that the reply count correctly reflects the number of direct child comments, that the parentComment field is null for top-level comments, and that all aggregated metrics (voteScore, replyCount) are calculated accurately.
 *
 * 1. Register a new member account with email, password, and unique username.
 * 2. Subscribe the member to an existing community to enable post creation.
 * 3. Create a post in the subscribed community.
 * 4. Create a top-level comment on the post.
 * 5. Create a reply comment to the top-level comment to verify reply count.
 * 6. Retrieve the top-level comment via the profile endpoint.
 * 7. Validate that the comment content, author info, post context, vote score, and reply count are correct.
 * 8. Verify that parentComment is null for top-level comments.
 */
export async function test_api_comment_retrieval_with_threaded_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (comment author)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Subscribe member to a community (using a pre-existing community ID)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await generate_random_reddit_clone_member_communities_subscriptions_create(
    memberConnection,
    {
      params: { communityId },
    },
  );
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: communityId,
      },
    },
  );
  typia.assert(post);
  // 4. Create a top-level comment on the post
  const topLevelComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(topLevelComment);
  // 5. Create a reply comment to the top-level comment
  const replyComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: topLevelComment.id,
        },
      },
    );
  typia.assert(replyComment);
  // 6. Retrieve the top-level comment via profile endpoint (public access)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedComment =
    await api.functional.redditClone.profiles.comments.at(publicConnection, {
      profileId: member.id,
      commentId: topLevelComment.id,
    });
  typia.assert(retrievedComment);
  // 7. Validate comment content matches
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    topLevelComment.content,
  );
  // 8. Validate author information
  TestValidator.equals(
    "author id matches",
    retrievedComment.author.id,
    member.id,
  );
  TestValidator.predicate(
    "author has display name",
    retrievedComment.author.display_name.length > 0,
  );
  TestValidator.predicate(
    "author has karma",
    typeof retrievedComment.author.karma === "number",
  );
  // 9. Validate post information
  TestValidator.equals("post id matches", retrievedComment.post.id, post.id);
  TestValidator.equals(
    "post title matches",
    retrievedComment.post.title,
    post.title,
  );
  TestValidator.predicate(
    "post has vote score",
    typeof retrievedComment.post.vote_score === "number",
  );
  TestValidator.predicate(
    "post has comment count",
    typeof retrievedComment.post.comment_count === "number",
  );
  // 10. Validate vote score (should be 0 initially)
  TestValidator.equals(
    "vote score is zero initially",
    retrievedComment.voteScore,
    0,
  );
  // 11. Validate reply count (should be 1)
  TestValidator.equals("reply count is one", retrievedComment.replyCount, 1);
  // 12. Validate parent comment is null for top-level comment
  TestValidator.equals(
    "parent comment is null for top-level",
    retrievedComment.parentComment,
    null,
  );
  // 13. Validate timestamps exist
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedComment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedComment.updated_at.length > 0,
  );
  // 14. Validate comment is not deleted
  TestValidator.equals(
    "deleted_at is null for active comment",
    retrievedComment.deleted_at,
    null,
  );
}
