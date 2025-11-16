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

export async function test_api_platform_admin_reads_default_post_state_for_new_post(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-authenticates via SDK)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassword123!",
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

  // 2. Create a visibility level as platformAdmin
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register member user (auto-authenticates as memberUser)
  const memberEmail =
    `member_${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">;

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: "MemberPassword123!",
    ip: "127.0.0.1",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create community as memberUser using created visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
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

  // 5. Switch back to platformAdmin via login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // 5. Create a post type configuration (e.g., text)
  const postTypeCode = `text_${RandomGenerator.alphaNumeric(8)}`;
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 6. Switch to memberUser via login
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 6. Create a post within the community as memberUser
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Switch back to platformAdmin to inspect post state
  const platformAdminLoginForReadState: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginForReadState);

  // 7. Fetch post state as platformAdmin
  const state: ICommunityPlatformPostState =
    await api.functional.communityPlatform.platformAdmin.posts.state.at(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(state);

  // 8. Assert basic invariants about the returned state
  TestValidator.equals(
    "post state should be associated with the created post id",
    state.post_id,
    post.id,
  );

  // business-agnostic checks for string fields (non-empty)
  TestValidator.predicate(
    "visibility_state should be a non-empty string",
    typeof state.visibility_state === "string" &&
      state.visibility_state.length > 0,
  );
  TestValidator.predicate(
    "lock_state should be a non-empty string",
    typeof state.lock_state === "string" && state.lock_state.length > 0,
  );
  TestValidator.predicate(
    "archival_state should be a non-empty string",
    typeof state.archival_state === "string" && state.archival_state.length > 0,
  );
  TestValidator.predicate(
    "moderation_state should be a non-empty string",
    typeof state.moderation_state === "string" &&
      state.moderation_state.length > 0,
  );

  // moderation_reason: null or string acceptable
  TestValidator.predicate(
    "moderation_reason is either null/undefined or non-empty string",
    state.moderation_reason === null ||
      state.moderation_reason === undefined ||
      (typeof state.moderation_reason === "string" &&
        state.moderation_reason.length >= 0),
  );

  // created_at and updated_at: valid date-time strings and updated_at >= created_at
  const createdAt = new Date(state.created_at);
  const updatedAt = new Date(state.updated_at);

  TestValidator.predicate(
    "created_at should be a valid date",
    !Number.isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be a valid date",
    !Number.isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );
}
