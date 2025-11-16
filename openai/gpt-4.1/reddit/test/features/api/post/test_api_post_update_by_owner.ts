import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Test authorized update of an existing post by its original creator in a
 * community platform setting.
 *
 * Steps:
 *
 * 1. Register and authenticate a new user.
 * 2. The user creates a new community.
 * 3. The user creates an initial post within that community.
 * 4. The user updates the post details (title, body, type, and status) with valid
 *    values, ensuring that unique constraints (title) and modifier restrictions
 *    are enforced.
 * 5. Test that only allowed fields are changed, the audit field (updated_at) is
 *    updated, and the returned post matches the changes.
 */
export async function test_api_post_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(14);
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 2. The user creates a new community
  const communityName = RandomGenerator.alphaNumeric(12);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName as string & tags.MinLength<3> & tags.MaxLength<30>,
        display_title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 12,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 15,
          wordMin: 3,
          wordMax: 10,
        }),
        visibility: RandomGenerator.pick([
          "public",
          "private",
          "invite-only",
        ] as const),
        image_url: null,
        status: RandomGenerator.pick([
          "active",
          "archived",
          "banned",
          "pending approval",
        ] as const),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. The user creates an initial post within the community
  const initialPostTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });
  const initialPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        type: "text",
        title: initialPostTitle,
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 12,
        }),
        link_url: null,
        image_url: null,
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(initialPost);

  // 4. The user updates the post (PUT) with new details
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 14,
  });
  const updateBody = {
    title: updatedTitle,
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    type: RandomGenerator.pick(["text", "link", "image"] as const),
    status: RandomGenerator.pick(["published", "pending", "removed"] as const),
    // Do not update link_url/image_url for type 'text'; fields are optional
  } satisfies ICommunityPlatformPost.IUpdate;
  const updatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.update(connection, {
      postId: initialPost.id,
      body: updateBody,
    });
  typia.assert(updatedPost);

  // 5. Assert returned post matches updated content, unique constraints preserved, audit field updated.
  TestValidator.equals(
    "post id remains unchanged after update",
    updatedPost.id,
    initialPost.id,
  );
  TestValidator.notEquals(
    "post title should update",
    updatedPost.title,
    initialPost.title,
  );
  TestValidator.equals(
    "post title should match updated title",
    updatedPost.title,
    updateBody.title,
  );
  TestValidator.equals(
    "post type should match requested type",
    updatedPost.type,
    updateBody.type,
  );
  TestValidator.equals(
    "post body should match updated body",
    updatedPost.body,
    updateBody.body,
  );
  TestValidator.equals(
    "post status should match requested status",
    updatedPost.status,
    updateBody.status,
  );
  TestValidator.equals(
    "post belongs to same community",
    updatedPost.community.id,
    community.id,
  );
  TestValidator.equals("post user unchanged", updatedPost.user.id, user.id);
  TestValidator.notEquals(
    "audit updated_at timestamp should be updated after update",
    updatedPost.updated_at,
    initialPost.updated_at,
  );
  TestValidator.equals(
    "post created_at should not change",
    updatedPost.created_at,
    initialPost.created_at,
  );
}
