import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate that an original author memberUser can update mutable fields of
 * their post.
 *
 * Business flow covered by this E2E test:
 *
 * 1. Register a memberUser (post author) and obtain an authenticated session.
 * 2. Register a platformAdmin and obtain an authenticated session for admin-only
 *    setup.
 * 3. As platformAdmin, create a community visibility level (e.g., "public").
 * 4. Switch to memberUser and create a community that uses this visibility level.
 * 5. Switch back to platformAdmin and create a text-style post type.
 * 6. Switch to memberUser and create an initial text post in the community using
 *    that post type.
 * 7. As the same memberUser author, update the post's title and body via PUT
 *    /communityPlatform/memberUser/posts/{postId}, leaving url and image_uri
 *    unchanged.
 * 8. Assert that:
 *
 *    - The returned post has updated title/body.
 *    - Community, author, and postType associations are unchanged.
 *    - Is_edited is true after the update.
 *    - Updated_at is later than created_at, indicating an edit.
 */
export async function test_api_post_update_by_author_basic_fields(
  connection: api.IConnection,
) {
  // 1. Register the memberUser who will be the post author.
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // Optional ip can be omitted; href and referrer are required URIs.
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Register a platformAdmin for configuration operations.
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    // ip is optional
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 3. As platformAdmin (current session is platformAdmin due to join),
  //    create a community visibility level that communities can reference.
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 4. Switch to memberUser session for community creation.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: memberLoginBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // Create a community owned by this memberUser using the created visibility level.
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    // primaryTagIds is optional; omit for simplicity.
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 5. Switch back to platformAdmin to create a text-style post type.
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLogin = await api.functional.auth.platformAdmin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLogin);

  const postTypeCode = `text_${RandomGenerator.alphaNumeric(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: "Plain text post type used for simple discussions.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 6. Switch to memberUser again to create and then update the post.
  const memberLoginAgain = await api.functional.auth.memberUser.login(
    connection,
    {
      body: memberLoginBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAgain);

  // Create an initial text post.
  const originalTitle = `Original ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const originalBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: originalTitle,
    body: originalBody,
    // For text posts, url and image_uri are not used; omit them.
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(createdPost);

  // Capture baseline for comparison.
  const originalCommunityId = createdPost.community.id;
  const originalAuthorId = createdPost.author.id;
  const originalPostTypeId = createdPost.postType.id;
  const originalCreatedAt = createdPost.created_at;
  const originalUpdatedAt = createdPost.updated_at;
  const originalIsEdited = createdPost.is_edited;
  const originalUrl = createdPost.url;
  const originalImageUri = createdPost.image_uri;

  // 7. Update the post's title and body as the same author.
  const updatedTitle = `Updated ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const updatedBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 8,
  });

  const postUpdateBody = {
    title: updatedTitle,
    body: updatedBody,
    // url and image_uri omitted so they should remain unchanged.
  } satisfies ICommunityPlatformPost.IUpdate;

  const updatedPost =
    await api.functional.communityPlatform.memberUser.posts.update(connection, {
      postId: createdPost.id,
      body: postUpdateBody,
    });
  typia.assert<ICommunityPlatformPost>(updatedPost);

  // 8. Business validations.
  // 8-1. Title and body updated.
  TestValidator.equals(
    "post title should be updated to new value",
    updatedPost.title,
    updatedTitle,
  );
  TestValidator.notEquals(
    "post title should differ from original title",
    updatedPost.title,
    originalTitle,
  );

  TestValidator.equals(
    "post body should be updated to new value",
    updatedPost.body,
    updatedBody,
  );
  TestValidator.notEquals(
    "post body should differ from original body",
    updatedPost.body,
    originalBody,
  );

  // 8-2. Immutable associations unchanged.
  TestValidator.equals(
    "community association must remain unchanged",
    updatedPost.community.id,
    originalCommunityId,
  );
  TestValidator.equals(
    "author association must remain unchanged",
    updatedPost.author.id,
    originalAuthorId,
  );
  TestValidator.equals(
    "postType association must remain unchanged",
    updatedPost.postType.id,
    originalPostTypeId,
  );

  // 8-3. url and image_uri remain unchanged.
  TestValidator.equals(
    "url must remain unchanged when not updated",
    updatedPost.url,
    originalUrl,
  );
  TestValidator.equals(
    "image_uri must remain unchanged when not updated",
    updatedPost.image_uri,
    originalImageUri,
  );

  // 8-4. Edit tracking: is_edited flag and updated_at timestamp.
  TestValidator.predicate(
    "is_edited should be true after updating the post",
    updatedPost.is_edited === true,
  );
  TestValidator.predicate(
    "is_edited flag should reflect a change from the original value",
    updatedPost.is_edited !== originalIsEdited ||
      updatedPost.is_edited === true,
  );

  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    new Date(updatedPost.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
  TestValidator.predicate(
    "updated_at should change when the post is edited",
    updatedPost.updated_at !== originalUpdatedAt,
  );
}
