import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test successful post update by the original author.
 *
 * This test validates that a post author can successfully update their own post,
 * including modifying the title and type-specific content (text body for text posts).
 * The test also verifies that the updated_at timestamp is automatically refreshed
 * and that immutable fields (id, createdAt, postType, author, community) remain unchanged.
 */
export async function test_api_post_update_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create community (creator becomes owner and is automatically subscribed)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Create a text post with original title and content
  const originalTitle = "Original Title";
  const originalContent = "Original content here";
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          title: originalTitle,
          postType: "text",
          content: originalContent,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // Record original timestamp
  const originalUpdatedAt = post.updatedAt;
  // 4. Update the post with new title and content
  const updatedTitle = "Updated Title";
  const updatedContent = "This is the updated content body";
  // Small delay to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: post.id,
        body: {
          title: updatedTitle,
          text: updatedContent,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updatedPost);
  // 5. Validate updated fields
  TestValidator.equals("title updated", updatedPost.title, updatedTitle);
  TestValidator.equals("content updated", updatedPost.content, updatedContent);
  // 6. Validate timestamp was refreshed
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    new Date(updatedPost.updatedAt).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );
  // 7. Validate immutable fields remain unchanged
  TestValidator.equals("post id unchanged", updatedPost.id, post.id);
  TestValidator.equals(
    "created_at unchanged",
    updatedPost.createdAt,
    post.createdAt,
  );
  TestValidator.equals("postType unchanged", updatedPost.postType, "text");
  TestValidator.equals("author id unchanged", updatedPost.author.id, member.id);
  TestValidator.equals(
    "community id unchanged",
    updatedPost.community.id,
    community.id,
  );
}
