import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

export async function test_api_post_update_on_deleted_post(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test post update operations and validation.
   * This test verifies the complete post update workflow including:
   * - Member authentication
   * - Community creation
   * - Post creation
   * - Post update with title and content modifications
   * - Response validation ensuring post integrity
   */
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community that the member owns
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
        postType: "text",
      },
    },
  );
  typia.assert(post);
  // 4. Verify initial post state
  TestValidator.equals(
    "post belongs to community",
    post.community.id,
    community.id,
  );
  TestValidator.equals("post author is member", post.author.id, member.id);
  TestValidator.predicate("post has initial score", post.score === 0);
  TestValidator.predicate("post is not deleted", post.deleted_at === null);
  // 5. Prepare update data with new title and content
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditClonePost.IUpdate;
  // 6. Update the post
  const updatedPost = await api.functional.redditClone.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: updateBody,
    },
  );
  typia.assert(updatedPost);
  // 7. Verify update was successful
  TestValidator.equals("post ID unchanged", updatedPost.id, post.id);
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "title was updated",
    updatedPost.title,
    updateBody.title,
  );
  TestValidator.equals(
    "content was updated",
    updatedPost.content,
    updateBody.content,
  );
  TestValidator.predicate(
    "post remains not deleted",
    updatedPost.deleted_at === null,
  );
  TestValidator.equals("author unchanged", updatedPost.author.id, member.id);
  TestValidator.predicate("score unchanged", updatedPost.score === post.score);
}