import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

export async function test_api_comment_retrieval_active_comment_by_guest(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a guest user can retrieve an active comment by its ID.
   * This test verifies the complete workflow: member registration, community creation,
   * post creation, comment creation, and finally comment retrieval by an unauthenticated
   * guest user. The test validates that active comments are publicly accessible and
   * contain all required fields including author information, post references, and metadata.
   */
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community as the member
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in that community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "text",
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: commentContent,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Create a guest connection (no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  // 6. Retrieve the comment as a guest user
  const retrievedComment = await api.functional.redditClone.comments.at(
    guestConnection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(retrievedComment);
  // 7. Validate business logic
  TestValidator.equals(
    "comment content matches input",
    retrievedComment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment score is zero initially",
    retrievedComment.score,
    0,
  );
  TestValidator.equals("comment ID matches", retrievedComment.id, comment.id);
  TestValidator.equals("post ID matches", retrievedComment.post.id, post.id);
  TestValidator.equals(
    "author ID matches",
    retrievedComment.author.id,
    community.owner.id,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedComment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedComment.updated_at.length > 0,
  );
  TestValidator.equals(
    "parent is null for top-level comment",
    retrievedComment.parent,
    null,
  );
  TestValidator.predicate(
    "author username exists",
    retrievedComment.author.username.length > 0,
  );
  TestValidator.predicate(
    "author display_name exists",
    retrievedComment.author.display_name.length > 0,
  );
  TestValidator.equals(
    "post title matches",
    retrievedComment.post.title,
    post.title,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedComment.post.community.id,
    community.id,
  );
}