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

/**
 * Test retrieval of a nested reply comment to verify the parent reference is correctly populated.
 * Creates a top-level comment and a reply comment, then retrieves the reply to validate
 * that the parent object contains the correct parent comment summary with author information.
 */
export async function test_api_comment_retrieve_nested_reply_with_parent_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member authentication
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  // 2. Create community for the test post
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Create a top-level comment (parent comment)
  const parentComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      member1Connection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(parentComment);
  // 5. Second member authentication
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 6. Create a reply comment to the top-level comment
  const replyComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      member2Connection,
      {
        params: {
          postId: post.id,
        },
        body: {
          parent_id: parentComment.id,
        },
      },
    );
  typia.assert(replyComment);
  // 7. Retrieve the reply comment
  const retrievedComment = await api.functional.redditClone.posts.comments.at(
    member2Connection,
    {
      postId: post.id,
      commentId: replyComment.id,
    },
  );
  typia.assert(retrievedComment);
  // 8. Validate parent reference
  TestValidator.predicate(
    "reply comment has parent reference",
    retrievedComment.parent !== null,
  );
  // Validate parent.id matches the top-level comment's id
  TestValidator.equals(
    "parent id matches original comment",
    retrievedComment.parent?.id,
    parentComment.id,
  );
  // Validate parent.post_id matches the retrieved comment's post_id
  TestValidator.equals(
    "parent post id matches comment post id",
    retrievedComment.parent?.post.id,
    retrievedComment.post.id,
  );
  // Validate parent author information is included
  TestValidator.predicate(
    "parent has author information",
    retrievedComment.parent?.author !== undefined,
  );
  TestValidator.equals(
    "parent author id matches first member",
    retrievedComment.parent?.author.id,
    parentComment.author.id,
  );
  // Validate threaded structure - both comments belong to same post
  TestValidator.equals(
    "both comments belong to same post",
    retrievedComment.post.id,
    parentComment.post.id,
  );
}
