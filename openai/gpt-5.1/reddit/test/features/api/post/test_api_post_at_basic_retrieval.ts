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
 * Basic retrieval of a community post by its identifier.
 *
 * This scenario validates that the public GET /communityPlatform/posts/{postId}
 * endpoint returns a full ICommunityPlatformPost representation for a post that
 * has been created through the authenticated memberUser flow.
 *
 * Business flow:
 *
 * 1. As a platform administrator, configure required master data:
 *
 *    - Create a community visibility level that can be referenced when creating a
 *         community.
 *    - Create a post type (e.g., text-style) that can be used by posts.
 * 2. As a member user, register (join) and implicitly become authenticated.
 * 3. Still as the member user, create a community using the visibility level code.
 * 4. As the same member user, create a post in that community referencing the
 *    created post type and providing title/body content.
 * 5. Call GET /communityPlatform/posts/{postId} with the created post's id.
 * 6. Validate that the response conforms to ICommunityPlatformPost and that the
 *    business fields match what was created (title/body, is_edited=false,
 *    deleted_at is null, community/author/postType associations correct).
 */
export async function test_api_post_at_basic_retrieval(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registers) to obtain admin privileges.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create a community visibility level master record.
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. As platformAdmin, create a post type definition.
  const postTypeCode = `text-${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Member user joins the platform.
  const memberUsername = RandomGenerator.name(1);
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = RandomGenerator.alphaNumeric(16);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: "192.168.0.10",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. As memberUser, create a community using the configured visibility level.
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(6)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communityDescription = RandomGenerator.paragraph({ sentences: 8 });

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: communityDescription,
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

  // 6. As memberUser, create a text-style post in the created community.
  const postTitle = RandomGenerator.paragraph({ sentences: 4 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: postTitle,
    body: postBody,
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(createdPost);

  // Sanity check on created post basics.
  TestValidator.equals(
    "created post title must match input",
    createdPost.title,
    postTitle,
  );
  TestValidator.equals(
    "created post body must match input",
    createdPost.body,
    postBody,
  );
  TestValidator.equals(
    "created post should not be edited initially",
    createdPost.is_edited,
    false,
  );
  TestValidator.equals(
    "created post deleted_at should be null initially",
    createdPost.deleted_at ?? null,
    null,
  );

  // 7. Retrieve the post via public GET /communityPlatform/posts/{postId}.
  const retrievedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert(retrievedPost);

  // 8. Validate basic content fields equality.
  TestValidator.equals(
    "retrieved post id matches created post id",
    retrievedPost.id,
    createdPost.id,
  );
  TestValidator.equals(
    "retrieved post title matches created title",
    retrievedPost.title,
    postTitle,
  );
  TestValidator.equals(
    "retrieved post body matches created body",
    retrievedPost.body,
    postBody,
  );
  TestValidator.equals(
    "retrieved post url remains null for text post",
    retrievedPost.url ?? null,
    null,
  );
  TestValidator.equals(
    "retrieved post image_uri remains null for text post",
    retrievedPost.image_uri ?? null,
    null,
  );

  // 9. Validate edit and deletion flags.
  TestValidator.equals(
    "retrieved post is_edited should remain false",
    retrievedPost.is_edited,
    false,
  );
  TestValidator.equals(
    "retrieved post deleted_at should remain null",
    retrievedPost.deleted_at ?? null,
    null,
  );

  // 10. Validate association objects: community, author, postType, and optional state.
  TestValidator.equals(
    "retrieved post community id matches created community id",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "retrieved post community name/slug should reflect community identifier",
    retrievedPost.community.slug,
    community.identifier,
  );
  TestValidator.equals(
    "retrieved post author id matches member user id",
    retrievedPost.author.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "retrieved post type id matches created post type id",
    retrievedPost.postType.id,
    postType.id,
  );
  TestValidator.equals(
    "retrieved post type code matches created post type code",
    retrievedPost.postType.code,
    postType.code,
  );

  // 11. State association is optional; when present, ensure it refers back to this post.
  if (retrievedPost.state !== undefined) {
    TestValidator.equals(
      "retrieved post state.post_id matches post id when state is present",
      retrievedPost.state.post_id,
      retrievedPost.id,
    );
  }
}
