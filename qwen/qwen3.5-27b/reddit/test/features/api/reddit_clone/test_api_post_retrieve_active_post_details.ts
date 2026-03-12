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

/**
 * Test retrieving a complete active post by its unique identifier.
 *
 * This test verifies that the GET /redditClone/posts/{postId} endpoint returns
 * the full post object with all fields including title, content, post type,
 * vote score, timestamps, and joined data from related entities (author and
 * community). The test creates a member, community, and post, then retrieves
 * the post by ID and validates all response fields.
 */
export async function test_api_post_retrieve_active_post_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (author)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a text post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Retrieve the post by ID (as guest - no authentication needed)
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedPost = await api.functional.redditClone.posts.at(
    guestConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // 5. Validate post fields
  TestValidator.equals("post id matches", retrievedPost.id, post.id);
  TestValidator.equals("post title matches", retrievedPost.title, post.title);
  TestValidator.equals(
    "post content matches",
    retrievedPost.content,
    post.content,
  );
  TestValidator.equals("post type matches", retrievedPost.post_type, "text");
  TestValidator.equals("score is zero", retrievedPost.score, 0);
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(retrievedPost.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(retrievedPost.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals("deleted_at is null", retrievedPost.deleted_at, null);
  // 6. Validate author information
  TestValidator.equals("author id matches", retrievedPost.author.id, member.id);
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    member.username,
  );
  TestValidator.equals(
    "author display_name matches",
    retrievedPost.author.display_name,
    member.display_name,
  );
  // 7. Validate community information
  TestValidator.equals(
    "community id matches",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  // 8. Validate images array is empty for text posts
  TestValidator.equals("images array is empty", retrievedPost.images.length, 0);
  // 9. Validate comments_count is zero
  TestValidator.equals(
    "comments_count is zero",
    retrievedPost.comments_count,
    0,
  );
}
