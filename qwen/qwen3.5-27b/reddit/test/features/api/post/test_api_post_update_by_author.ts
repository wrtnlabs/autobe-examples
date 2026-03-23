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
 * Test that a member can successfully update their own post's title and content.
 *
 * This test validates the post update workflow where:
 * 1. A member registers and authenticates
 * 2. Creates a community they own
 * 3. Creates a post in that community
 * 4. Updates the post's title and content
 * 5. Verifies the update was successful with correct data preservation
 */
export async function test_api_post_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community owned by the member
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const originalPost: IRedditClonePost =
    await generate_random_reddit_clone_member_posts_create(memberConnection, {
      body: {
        postType: "text",
        communityId: community.id,
      },
    });
  typia.assert(originalPost);
  // Store original values for comparison
  const originalTitle = originalPost.title;
  const originalContent = originalPost.content;
  const originalCreatedAt = originalPost.created_at;
  const originalScore = originalPost.score;
  const originalPostType = originalPost.post_type;
  const originalUpdatedAt = originalPost.updated_at;
  // 4. Update the post with new title and content
  const updatedPost: IRedditClonePost =
    await api.functional.redditClone.member.posts.update(memberConnection, {
      postId: originalPost.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.IUpdate,
    });
  typia.assert(updatedPost);
  // 5. Validate the update response
  // Verify title was updated and changed from original
  TestValidator.notEquals(
    "title changed from original",
    updatedPost.title,
    originalTitle,
  );
  // Verify content was updated and changed from original
  TestValidator.notEquals(
    "content changed from original",
    updatedPost.content,
    originalContent,
  );
  // Verify post type is unchanged
  TestValidator.equals(
    "post type unchanged",
    updatedPost.post_type,
    originalPostType,
  );
  // Verify score is unchanged
  TestValidator.equals("score unchanged", updatedPost.score, originalScore);
  // Verify author is unchanged
  TestValidator.equals(
    "author unchanged",
    updatedPost.author.id,
    originalPost.author.id,
  );
  // Verify community is unchanged
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    community.id,
  );
  // Verify created_at timestamp is preserved
  TestValidator.equals(
    "created_at preserved",
    updatedPost.created_at,
    originalCreatedAt,
  );
  // Verify updated_at is refreshed (newer than original)
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedPost.updated_at,
    originalUpdatedAt,
  );
  // Verify updated_at is after or equal to created_at
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedPost.updated_at).getTime() >=
      new Date(updatedPost.created_at).getTime(),
  );
  // Verify updated_at is after or equal to original updated_at
  TestValidator.predicate(
    "updated_at is after original updated_at",
    new Date(updatedPost.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
}
