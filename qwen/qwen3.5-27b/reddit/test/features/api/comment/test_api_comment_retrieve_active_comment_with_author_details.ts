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
 * Test retrieving an active comment with complete author and post details.
 *
 * This test validates the primary success path of retrieving a single comment
 * by its ID within a post context. It verifies that the response contains all
 * expected fields including comment content, score, timestamps, author
 * information, post information, and parent reference.
 */
export async function test_api_comment_retrieve_active_comment_with_author_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community for the test post
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {},
      },
    );
  typia.assert(comment);
  // 5. Retrieve the comment by ID
  const retrieved = await api.functional.redditClone.posts.comments.at(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  typia.assert(retrieved);
  // 6. Validate comment content matches
  TestValidator.equals(
    "comment content matches",
    retrieved.content,
    comment.content,
  );
  // 7. Validate score is initialized to 0
  TestValidator.equals("score initialized to 0", retrieved.score, 0);
  // 8. Validate deleted_at is null for active comment
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  // 9. Validate parent is null for top-level comment
  TestValidator.equals("parent is null", retrieved.parent, null);
  // 10. Validate author details exist
  TestValidator.predicate(
    "author has username",
    retrieved.author.username.length > 0,
  );
  TestValidator.predicate(
    "author has display_name",
    retrieved.author.display_name.length > 0,
  );
  TestValidator.predicate(
    "author has karma",
    typeof retrieved.author.karma === "number",
  );
  // 11. Validate post details exist
  TestValidator.equals("post title matches", retrieved.post.title, post.title);
  TestValidator.equals(
    "post type matches",
    retrieved.post.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "post community matches",
    retrieved.post.community.id,
    community.id,
  );
  // 12. Validate timestamps exist
  TestValidator.predicate(
    "created_at is valid",
    retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrieved.updated_at.length > 0,
  );
}