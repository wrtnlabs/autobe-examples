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
 * Validate creation of an image-style community post by a member user.
 *
 * Business workflow covered by this test:
 *
 * 1. A member user joins the platform (auth.memberUser.join) and becomes
 *    authenticated.
 * 2. A platform admin joins (auth.platformAdmin.join) and, as platformAdmin,
 *    creates a community visibility level master record.
 * 3. Switching back to the member user actor, the member user creates a community
 *    with that visibility level
 *    (communityPlatform.memberUser.communities.create).
 * 4. Switching again to platform admin, an image-oriented post type is registered
 *    (communityPlatform.platformAdmin.postTypes.create).
 * 5. Finally, the member user creates a post in the created community using the
 *    image-oriented post type and providing image_uri as the primary content,
 *    leaving body and url explicitly null.
 *
 * The test validates that:
 *
 * - The created post has body === null and url === null.
 * - Image_uri on the post matches the input image URI.
 * - Is_edited is false for a newly created post.
 * - The post's community association matches the community created earlier.
 * - The post's author association matches the joining member user.
 * - The postType association matches the created image-style post type.
 */
export async function test_api_post_creation_image_post(
  connection: api.IConnection,
) {
  // 1. Member user joins and becomes authenticated
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinRequest = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: "P@ssw0rd-" + RandomGenerator.alphaNumeric(8),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 2. Platform admin joins and creates a visibility level
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinRequest = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: "Adm1nP@ss-" + RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
    ip: "203.0.113.10",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  const visibilityCode = "public-image-vis";
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Image Visibility",
    description:
      "Visibility level for communities that host image-centric posts.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Switch back to member user and create a community using the visibility code
  const memberLoginRequest = {
    identifier: memberEmail,
    password: memberJoinRequest.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginRequest,
    });
  typia.assert(memberLoginAuthorized);

  const communityIdentifier =
    "img-community-" + RandomGenerator.alphaNumeric(8);
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Image Posting Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. Switch back to platform admin and create an image-style post type
  const adminLoginRequest = {
    identifier: adminEmail,
    password: adminJoinRequest.password,
    ip: "203.0.113.11",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminLoginAuthorized);

  const postTypeCode = "image";
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Image Post",
    description:
      "Post type intended for image-centric content where image_uri is the primary field.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 5. Switch to member user again and create an image-style post
  const memberLoginAgainRequest = {
    identifier: memberEmail,
    password: memberJoinRequest.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer:
      "https://member.example.com/community/" + community.identifier_normalized,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAgainAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginAgainRequest,
    });
  typia.assert(memberLoginAgainAuthorized);

  const imageUri: string & tags.Format<"uri"> =
    "https://cdn.example.com/images/" +
    RandomGenerator.alphaNumeric(16) +
    ".png";

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Sunset over the mountains",
    body: null,
    url: null,
    image_uri: imageUri,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 6. Business validations
  // Core content expectations
  TestValidator.equals(
    "post body should be null for image-style post",
    post.body ?? null,
    null,
  );
  TestValidator.equals(
    "post url should be null for image-style post",
    post.url ?? null,
    null,
  );
  TestValidator.equals(
    "post image_uri should match input image URI",
    post.image_uri ?? null,
    imageUri,
  );

  // is_edited flag should be false on creation
  TestValidator.equals(
    "newly created post should not be marked as edited",
    post.is_edited,
    false,
  );

  // Community association should match created community
  TestValidator.equals(
    "post community id should match created community id",
    post.community.id,
    community.id,
  );

  // Author association should match member user
  TestValidator.equals(
    "post author id should match member user id",
    post.author.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "post author username should match member username",
    post.author.username,
    memberAuthorized.username,
  );

  // Post type association should match created post type
  TestValidator.equals(
    "postType id on post should match created postType id",
    post.postType.id,
    postType.id,
  );
  TestValidator.equals(
    "postType code on post should match created postType code",
    post.postType.code,
    postTypeCode,
  );
}
