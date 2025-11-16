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
 * Validate that a non-author member user cannot update another member’s post
 * using the memberUser update endpoint.
 *
 * Business context
 *
 * - The endpoint PUT /communityPlatform/memberUser/posts/{postId} is intended for
 *   regular memberUser actors to edit _their own_ posts.
 * - Authorization is identity-based: the backend derives the author from the
 *   authenticated memberUser session (author_memberuser_id), not from any
 *   client-supplied ID.
 * - Other roles (moderators / platformAdmin) would use different endpoints for
 *   privileged edits; they are out of scope for this test.
 *
 * What this test validates
 *
 * 1. A memberUser (A) can successfully create a community and a post when properly
 *    authenticated.
 * 2. A different memberUser (B), authenticated separately, is _not_ allowed to
 *    update A’s post through
 *    api.functional.communityPlatform.memberUser.posts.update.
 * 3. The update attempt fails with some error (authorization / business-rule
 *    error); we do not assert on a specific HTTP status code or message.
 * 4. Because no read-by-id endpoint is available in the given materials, we treat
 *    the failure of the update call itself as evidence that the post was not
 *    modified.
 *
 * High-level steps
 *
 * 1. Register and authenticate a platformAdmin via /auth/platformAdmin/join so we
 *    can create supporting master data (visibility level and post type).
 * 2. As platformAdmin, create a visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. As platformAdmin, create a post type (e.g. "text") via
 *    /communityPlatform/platformAdmin/postTypes.
 * 4. Register memberUser A via /auth/memberUser/join (this implicitly
 *    authenticates A as the current memberUser actor).
 * 5. As memberUser A, create a community via
 *    /communityPlatform/memberUser/communities using the created visibility
 *    level code.
 * 6. As memberUser A, create a post in that community via
 *    /communityPlatform/memberUser/posts using the created post type id.
 * 7. Register memberUser B via a second /auth/memberUser/join call; after this
 *    call, B is the authenticated memberUser actor on the shared connection.
 * 8. As memberUser B, attempt to update A’s post using
 *    api.functional.communityPlatform.memberUser.posts.update(postId, body).
 * 9. Wrap the update attempt in await TestValidator.error("non-author cannot
 *    update post", async () => ...), asserting only that an error is thrown.
 *
 * Notes and constraints
 *
 * - All request bodies must be constructed to satisfy the corresponding DTOs:
 *
 *   - ICommunityPlatformPlatformadmin.IJoin for platform admin join
 *   - ICommunityPlatformCommunityVisibilityLevel.ICreate for visibility level
 *   - ICommunityPlatformPostType.ICreate for post type
 *   - ICommunityPlatformMemberuser.IJoinRequest for memberUser joins
 *   - ICommunityPlatformCommunity.ICreate for community creation
 *   - ICommunityPlatformPost.ICreate for post creation
 *   - ICommunityPlatformPost.IUpdate for the update attempt
 * - Use typia.assert(response) on all non-void API responses.
 * - Never touch connection.headers directly; rely on the SDK’s built-in behavior
 *   that join/login sets Authorization automatically.
 * - We must not assert specific HTTP status codes or error payloads.
 */
export async function test_api_post_update_rejected_for_non_author_member_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin to create master data.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a community visibility level as platformAdmin.
  const visibilityCode = `vis_${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type as platformAdmin.
  const postTypeCode = `text_${RandomGenerator.alphabets(6)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: "Standard text-based post type for community discussions.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Register memberUser A (author) via /auth/memberUser/join.
  const memberUserAJoinBody = {
    username: `author_${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(10)}@member.example.com`,
    password: "P@ssw0rd!",
    ip: "192.168.0.10",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserAJoinBody,
    });
  typia.assert(memberUserA);

  // 5. As memberUser A, create a community using the visibility level code.
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Non-Author Update",
    description: RandomGenerator.paragraph({ sentences: 8 }),
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

  // 6. As memberUser A, create a post in that community using the post type.
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Original Post Title from Author A",
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const originalPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(originalPost);

  // 7. Register memberUser B via a second join (this authenticates B).
  const memberUserBJoinBody = {
    username: `other_${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(10)}@member.example.com`,
    password: "P@ssw0rd!",
    ip: "192.168.0.20",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/referral",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserBJoinBody,
    });
  typia.assert(memberUserB);

  // 8. As memberUser B (non-author), attempt to update A's post.
  const updateBody = {
    title: "Illegitimate Update by Non-Author B",
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.IUpdate;

  await TestValidator.error(
    "non-author memberUser cannot update another user's post",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.update(
        connection,
        {
          postId: originalPost.id,
          body: updateBody,
        },
      );
    },
  );
}
