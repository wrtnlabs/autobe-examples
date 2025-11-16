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
 * Validate that detailed post retrieval honors restricted/private community
 * visibility configuration while still allowing legitimate member access.
 *
 * Business goal:
 *
 * - Ensure that a post created inside a community configured with a non-default
 *   (restricted/private-like) visibility level is retrievable via GET
 *   /communityPlatform/posts/{postId} when called by the owning member user,
 *   and that the response correctly reflects the community and visibility-level
 *   relationships.
 *
 * High-level steps:
 *
 * 1. As platform admin, create a special visibility level (treated as
 *    restricted/private) and a post type.
 * 2. As member user, create a community using that restricted visibility level,
 *    and then create a post in that community using the created post type.
 * 3. Still as the same member user, call GET /communityPlatform/posts/{postId} for
 *    that post and verify:
 *
 *    - The post is returned and typia.assert passes.
 *    - The post.id matches the created post id.
 *    - Post.community.id matches the created community id.
 *    - Post.community.visibilityLevel.code matches the restricted visibility level
 *         code created by the admin.
 *    - Post.postType.id matches the created post type id.
 */
export async function test_api_post_at_visibility_respects_private_community_rules(
  connection: api.IConnection,
) {
  // 1. Platform admin bootstrap: join and create restricted visibility level + post type
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Create a visibility level representing restricted/private communities
  const restrictedVisibilityCode = `restricted_${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: restrictedVisibilityCode,
    name: "Restricted Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const restrictedVisibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(restrictedVisibility);

  // Create a post type that the member's post will reference
  const postTypeCode = `text_${RandomGenerator.alphabets(6)}`;
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

  // 2. Member user bootstrap: join and login
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Explicit login to satisfy dependency semantics (actor switching)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 3. Create a community with restricted visibility as member user
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: restrictedVisibility.code,
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

  // 4. Create a post in that restricted community as the same member user
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(createdPost);

  // 5. Retrieve the post via public detail endpoint while authenticated as member user
  const fetchedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert(fetchedPost);

  // 6. Assertions to confirm visibility-respecting associations
  TestValidator.equals(
    "fetched post id matches created post id",
    fetchedPost.id,
    createdPost.id,
  );

  TestValidator.equals(
    "fetched community id matches created community id",
    fetchedPost.community.id,
    community.id,
  );

  TestValidator.equals(
    "fetched community visibilityLevel.code matches restricted visibility code",
    fetchedPost.community.visibilityLevel.code,
    restrictedVisibility.code,
  );

  TestValidator.equals(
    "fetched postType id matches created postType id",
    fetchedPost.postType.id,
    postType.id,
  );
}
