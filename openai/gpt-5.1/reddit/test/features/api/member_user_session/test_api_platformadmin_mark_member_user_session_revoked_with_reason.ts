import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate that a platform administrator can mark a member user session as
 * revoked with a human-readable reason, using the platformAdmin-only session
 * update endpoint.
 *
 * Business context
 *
 * - Member users authenticate and obtain sessions that are used for community
 *   activity.
 * - Platform administrators need the ability to administratively revoke specific
 *   sessions and optionally record a reason and explicit expiration time for
 *   audit/compliance.
 *
 * Test steps
 *
 * 1. Create a member user via /auth/memberUser/join, obtaining
 *    ICommunityPlatformMemberuser.IAuthorized.
 *
 *    - This implicitly creates an initial member user session, but its session id is
 *         not exposed.
 * 2. Create a platform administrator via /auth/platformAdmin/join so that we have
 *    platformAdmin context.
 * 3. Under platformAdmin context, create supporting master data to mirror
 *    realistic usage:
 *
 *    - Create a community visibility level via
 *         /communityPlatform/platformAdmin/communityVisibilityLevels.
 *    - Create a post type via /communityPlatform/platformAdmin/postTypes.
 * 4. Switch back to memberUser context (login) and create domain usage:
 *
 *    - Create a community via /communityPlatform/memberUser/communities using the
 *         visibility level code.
 *    - Create a post via /communityPlatform/memberUser/posts using the community id
 *         and post type id. This ensures the member user has realistic
 *         activity, although it is not strictly required for the session update
 *         endpoint.
 * 5. Switch again to platformAdmin context (login) and call PUT
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/sessions/{sessionId}
 *    via
 *    api.functional.communityPlatform.platformAdmin.memberUsers.sessions.update.
 *
 *    - Use memberUserId from the member user authorization payload.
 *    - For sessionId, we must provide a UUID even though we do not know the real
 *         session backing the join/login; we generate a random UUID using
 *         typia.random.
 *    - Body must satisfy ICommunityPlatformMemberuserSession.IUpdate, where we set:
 *
 *         - Is_revoked = true
 *         - Revoked_reason = a non-empty explanatory string
 *         - Expired_at = current timestamp via new Date().toISOString().
 * 6. Assert that the call succeeds and the response is a valid
 *    ICommunityPlatformMemberuserSession using typia.assert.
 *
 *    - Because ICommunityPlatformMemberuserSession does not expose is_revoked or
 *         revoked_reason, we can only validate that expired_at is present
 *         (non-null) and that memberUser metadata is structurally valid.
 * 7. Optionally, attempt another memberUser login to demonstrate that token
 *    issuance still works; however, we do not assert cross-endpoint
 *    invalidation since the DTOs do not expose session identifiers, and there
 *    is no session listing API to cross-check.
 */
export async function test_api_platformadmin_mark_member_user_session_revoked_with_reason(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain an authorized payload
  const joinMemberInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinMemberInput,
    });
  typia.assert(memberAuthorized);

  // Capture member user id for later
  const memberUserId = memberAuthorized.id;

  // 2. Register a platform administrator and obtain platformAdmin context
  const joinAdminInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinAdminInput,
    });
  typia.assert(adminAuthorized);

  // 3. As platformAdmin, create a community visibility level
  const visibilityCreate = {
    code: `public-${RandomGenerator.alphaNumeric(6)}`,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreate },
    );
  typia.assert(visibility);

  // As platformAdmin, create a post type
  const postTypeCreate = {
    code: `text-${RandomGenerator.alphaNumeric(6)}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreate },
    );
  typia.assert(postType);

  // 4. Switch back to memberUser context by logging in
  const loginMemberInput = {
    identifier: joinMemberInput.email,
    password: joinMemberInput.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginMemberInput,
    });
  typia.assert(memberLoginAuthorized);

  // Create a community as the member user using the created visibility level
  const communityCreate = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Community for Session Revocation",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);

  // Create a post within the community using the created post type
  const postCreate = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Initial activity before session revocation",
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // 5. Switch again to platformAdmin context by logging in
  const loginAdminInput = {
    identifier: joinAdminInput.email,
    password: joinAdminInput.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginAdminInput,
    });
  typia.assert(adminLoginAuthorized);

  // Prepare the session update payload as platformAdmin
  const revokedReason = RandomGenerator.paragraph({ sentences: 8 });
  const nowIso = new Date().toISOString();

  const updateBody = {
    is_revoked: true,
    revoked_reason: revokedReason,
    expired_at: nowIso,
  } satisfies ICommunityPlatformMemberuserSession.IUpdate;

  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const updatedSession: ICommunityPlatformMemberuserSession =
    await api.functional.communityPlatform.platformAdmin.memberUsers.sessions.update(
      connection,
      {
        memberUserId,
        sessionId,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // 6. Validate expected structural properties and basic business expectations
  TestValidator.predicate(
    "updated session should belong to some member user summary",
    updatedSession.memberUser.id.length > 0,
  );

  TestValidator.predicate(
    "updated session expired_at should be non-null when we set it",
    updatedSession.expired_at !== null &&
      updatedSession.expired_at !== undefined,
  );

  // 7. Optional: demonstrate memberUser can still log in (no cross-endpoint assertion)
  const secondLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginMemberInput,
    });
  typia.assert(secondLogin);
}
