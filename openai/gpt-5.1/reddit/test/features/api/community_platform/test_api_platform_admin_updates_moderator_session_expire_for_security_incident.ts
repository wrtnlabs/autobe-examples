import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorSession";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate that a platform administrator can administratively expire a
 * community moderator session for a security incident while preserving
 * immutable ownership and network metadata fields.
 *
 * Business narrative:
 *
 * - A platform admin exists and can manage global configuration (visibility
 *   levels, post types).
 * - A member user can create communities and posts, providing realistic platform
 *   activity context.
 * - A community moderator session already exists in the system; the admin wants
 *   to forcibly expire it.
 *
 * Implementation notes:
 *
 * - We fully drive platformAdmin join and memberUser join/community/post flows
 *   using real APIs to keep the scenario realistic.
 * - For the community moderator session itself, the SDK only exposes an update
 *   endpoint, so we call it with valid random UUIDs and a deterministic
 *   expired_at timestamp and verify the response semantics.
 */
export async function test_api_platform_admin_updates_moderator_session_expire_for_security_incident(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (this also authenticates and sets Authorization header)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword!123",
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.mobile(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates a visibility level master record
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Admin creates a post type master record
  const postTypeCode = `text-${RandomGenerator.alphaNumeric(6)}`;
  const postTypeBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeBody,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 4. Member user joins (this also authenticates as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword!123",
    ip: RandomGenerator.mobile(),
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 5. Member user creates a community
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 6. Member user creates a post in the community using created post type
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 7. Switch back to platform admin context via login to ensure admin token is active
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: RandomGenerator.mobile(),
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLoggedIn);

  // 8. Prepare moderator session identifiers and desired expired_at timestamp
  const communityModeratorId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const expiredAt = new Date().toISOString() as string &
    tags.Format<"date-time">;

  const updateBody = {
    expired_at: expiredAt,
  } satisfies ICommunityPlatformCommunityModeratorSession.IUpdate;

  // 9. Platform admin updates the moderator session to set expired_at
  const updatedSession: ICommunityPlatformCommunityModeratorSession =
    await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.update(
      connection,
      {
        communityModeratorId,
        sessionId,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorSession>(updatedSession);

  // 10. Business assertions on the updated session
  TestValidator.equals(
    "session id should match requested sessionId",
    updatedSession.id,
    sessionId,
  );

  TestValidator.equals(
    "community moderator id should remain bound to requested communityModeratorId",
    updatedSession.community_platform_communitymoderator_id,
    communityModeratorId,
  );

  TestValidator.equals(
    "expired_at should equal requested timestamp",
    updatedSession.expired_at,
    expiredAt,
  );

  TestValidator.predicate(
    "ip should be a non-empty string",
    typeof updatedSession.ip === "string" && updatedSession.ip.length > 0,
  );

  TestValidator.predicate(
    "href should be a non-empty string",
    typeof updatedSession.href === "string" && updatedSession.href.length > 0,
  );

  TestValidator.predicate(
    "referrer should be a non-empty string",
    typeof updatedSession.referrer === "string" &&
      updatedSession.referrer.length > 0,
  );

  TestValidator.predicate(
    "created_at should be a non-empty ISO date-time string",
    typeof updatedSession.created_at === "string" &&
      updatedSession.created_at.length > 0,
  );
}
