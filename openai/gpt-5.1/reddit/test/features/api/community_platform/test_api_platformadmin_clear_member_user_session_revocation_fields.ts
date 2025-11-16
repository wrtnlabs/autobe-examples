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
 * Validate that a platform administrator can clear revocation-related metadata
 * on a member user session without altering immutable identifiers.
 *
 * Business flow:
 *
 * 1. A member user joins the platform, establishing an initial session.
 * 2. A platform admin account is provisioned.
 * 3. The platform admin configures a community visibility level.
 * 4. The member user creates a community using that visibility level.
 * 5. The platform admin defines a post type.
 * 6. The member user creates a post in the community using that post type,
 *    ensuring realistic prior activity for the member user's sessions.
 * 7. The platform admin performs an initial session update marking the session as
 *    revoked with a non-null expired_at (simulating revocation).
 * 8. The platform admin performs a follow-up update that clears revocation-related
 *    metadata (expired_at set back to null) while leaving immutable identifiers
 *    unchanged.
 * 9. The test asserts that id, memberUser, ip, href, referrer, and created_at are
 *    stable across the two updates and that expired_at is correctly cleared to
 *    null in the second response.
 */
export async function test_api_platformadmin_clear_member_user_session_revocation_fields(
  connection: api.IConnection,
) {
  // 1. Member user joins (creates account + initial session)
  const joinHref = "https://example.com/join" as string & tags.Format<"uri">;
  const joinReferrer = "https://example.com/landing" as string &
    tags.Format<"uri">;

  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    ip: "192.0.2.1",
    href: joinHref,
    referrer: joinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Platform admin joins
  const adminJoinHref = "https://example.com/admin/join" as string &
    tags.Format<"uri">;
  const adminJoinReferrer = "https://example.com/admin/landing" as string &
    tags.Format<"uri">;

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(2),
    ip: "198.51.100.10",
    href: adminJoinHref,
    referrer: adminJoinReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 3. As platform admin, create a community visibility level
  const visibilityLevelCreateBody = {
    code: `public-${RandomGenerator.alphabets(6)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Switch to member user context by logging in
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: "192.0.2.2",
    href: "https://example.com/login" as string & tags.Format<"uri">,
    referrer: "https://example.com/home" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // Create a community as the member user
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 5. Switch back to platform admin by logging in
  const platformAdminLoginBody = {
    identifier: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: "198.51.100.11",
    href: "https://example.com/admin/login" as string & tags.Format<"uri">,
    referrer: "https://example.com/admin" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // Create a post type as the platform admin
  const postTypeCreateBody = {
    code: `text-${RandomGenerator.alphabets(5)}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 6. Switch again to member user and create a post with that type
  const memberLoginForPostBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: "192.0.2.3",
    href: "https://example.com/login" as string & tags.Format<"uri">,
    referrer: "https://example.com/community" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginForPostAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginForPostBody,
    });
  typia.assert(memberLoginForPostAuthorized);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Switch back to platform admin for session updates
  const platformAdminLoginForSessionBody = {
    identifier: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: "198.51.100.12",
    href: "https://example.com/admin/login" as string & tags.Format<"uri">,
    referrer: "https://example.com/admin/sessions" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginForSessionAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginForSessionBody,
    });
  typia.assert(platformAdminLoginForSessionAuthorized);

  // Because the session DTO does not expose session IDs in auth responses, this
  // test treats the update call as a contract-level interaction and uses random
  // UUIDs for sessionId while using the real memberUserId.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 8. First update: mark as revoked with non-null expired_at
  const initialExpiredAt = new Date().toISOString() as string &
    tags.Format<"date-time">;

  const firstUpdateBody = {
    is_revoked: true,
    revoked_reason: "Suspicious activity detected",
    expired_at: initialExpiredAt,
  } satisfies ICommunityPlatformMemberuserSession.IUpdate;

  const firstSession: ICommunityPlatformMemberuserSession =
    await api.functional.communityPlatform.platformAdmin.memberUsers.sessions.update(
      connection,
      {
        memberUserId,
        sessionId,
        body: firstUpdateBody,
      },
    );
  typia.assert(firstSession);

  // Capture immutable baseline fields from the first response
  const baselineSessionId = firstSession.id;
  const baselineMemberUserId = firstSession.memberUser.id;
  const baselineIp = firstSession.ip;
  const baselineHref = firstSession.href;
  const baselineReferrer = firstSession.referrer;
  const baselineCreatedAt = firstSession.created_at;
  const baselineExpiredAt = firstSession.expired_at ?? null;

  // 9. Second update: clear revocation metadata (expired_at back to null)
  const secondUpdateBody = {
    revoked_reason: null,
    expired_at: null,
  } satisfies ICommunityPlatformMemberuserSession.IUpdate;

  const secondSession: ICommunityPlatformMemberuserSession =
    await api.functional.communityPlatform.platformAdmin.memberUsers.sessions.update(
      connection,
      {
        memberUserId,
        sessionId,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondSession);

  // 10. Assertions: immutable fields unchanged
  TestValidator.equals(
    "session id should remain unchanged after metadata clearing",
    secondSession.id,
    baselineSessionId,
  );

  TestValidator.equals(
    "member user id should remain unchanged on session",
    secondSession.memberUser.id,
    baselineMemberUserId,
  );

  TestValidator.equals(
    "session ip should remain unchanged",
    secondSession.ip,
    baselineIp,
  );

  TestValidator.equals(
    "session href should remain unchanged",
    secondSession.href,
    baselineHref,
  );

  TestValidator.equals(
    "session referrer should remain unchanged",
    secondSession.referrer,
    baselineReferrer,
  );

  TestValidator.equals(
    "session created_at should remain unchanged",
    secondSession.created_at,
    baselineCreatedAt,
  );

  // expired_at must be null after metadata clearing
  TestValidator.equals(
    "expired_at should be cleared to null on second update",
    secondSession.expired_at ?? null,
    null,
  );

  // Baseline expired_at in first update must be non-null to ensure we actually
  // changed something.
  TestValidator.predicate(
    "baseline expired_at from first update should be non-null",
    baselineExpiredAt !== null,
  );
}
