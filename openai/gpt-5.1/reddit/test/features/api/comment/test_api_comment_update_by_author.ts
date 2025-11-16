import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registers) and becomes authenticated
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert(platformAdminAuthorized);

  // 2. Create visibility level master data as platform admin
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create post type master data as platform admin
  const postTypeCode = `ptype_${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: `PostType ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Member user joins and becomes authenticated
  const memberUserPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: memberUserPassword,
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert(memberAuthorized);

  // 5. Create a community as the authenticated member user
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Create a post in that community as the member user
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: `Post ${RandomGenerator.name(2)}`,
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: postCreateBody,
    },
  );
  typia.assert(post);

  // 7. Create an initial comment on the post as the same member user
  const originalCommentBody = RandomGenerator.paragraph({ sentences: 4 });
  const commentCreateBody = {
    body: originalCommentBody,
    parentCommentId: undefined,
    renderingMode: "markdown" as const,
  } satisfies ICommunityPlatformComment.ICreate;

  const originalComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(originalComment);

  // Basic sanity checks on original comment
  TestValidator.equals(
    "original comment post id matches post.id",
    originalComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "original comment body matches create payload",
    originalComment.body,
    originalCommentBody,
  );
  TestValidator.equals(
    "original comment is_edited should be false",
    originalComment.is_edited,
    false,
  );
  TestValidator.equals(
    "original comment deleted_at should be null",
    originalComment.deleted_at,
    null,
  );

  const originalCreatedAt = new Date(originalComment.created_at).getTime();

  // 8. Update the comment as the same member user
  const updatedCommentBody = `${originalCommentBody} ${RandomGenerator.paragraph({ sentences: 2 })}`;

  const updateBody = {
    body: updatedCommentBody,
  } satisfies ICommunityPlatformComment.IUpdate;

  const updatedComment =
    await api.functional.communityPlatform.memberUser.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: originalComment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedComment);

  // 9. Validate that the updated comment matches expectations
  TestValidator.equals(
    "updated comment id should equal original comment id",
    updatedComment.id,
    originalComment.id,
  );

  TestValidator.equals(
    "updated comment post summary id should equal post.id",
    updatedComment.post.id,
    post.id,
  );

  TestValidator.equals(
    "updated comment body should equal new body",
    updatedComment.body,
    updatedCommentBody,
  );

  TestValidator.equals(
    "updated comment should have is_edited = true",
    updatedComment.is_edited,
    true,
  );

  TestValidator.equals(
    "updated comment deleted_at should remain null",
    updatedComment.deleted_at,
    null,
  );

  // Ensure updated_at is strictly greater than created_at
  const updatedAtMillis = new Date(updatedComment.updated_at).getTime();
  TestValidator.predicate(
    "updated_at must be greater than original created_at",
    updatedAtMillis > originalCreatedAt,
  );

  // Ensure parentComment remains unchanged (null)
  TestValidator.equals(
    "updated comment parentComment should remain null for top-level comment",
    updatedComment.parentComment,
    originalComment.parentComment,
  );
}
