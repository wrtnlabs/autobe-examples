import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserAchievement";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Verify that non-admin callers cannot create user achievements via the
 * admin-only achievements creation endpoint.
 *
 * Business goal:
 *
 * - Enforce role-based access control so that only adminUser actors can call POST
 *   /communityPlatform/adminUser/profiles/{handle}/achievements.
 * - Ensure both authenticated memberUser callers and completely unauthenticated
 *   callers are rejected and that no successful
 *   ICommunityPlatformUserAchievement is ever returned to them.
 *
 * Scenario steps:
 *
 * 1. Register a new memberUser via /auth/memberUser/join to obtain a valid
 *    community platform member account and its username handle.
 * 2. As that memberUser, create a community via
 *    /communityPlatform/memberUser/communities to exercise normal
 *    memberUser-only functionality (and to ensure the platform has at least one
 *    community associated with that user).
 * 3. Still authenticated as the memberUser, attempt to create a user achievement
 *    for the member's profile by calling
 *    api.functional.communityPlatform.adminUser.profiles.achievements.create
 *    using the member user's username as the {handle} path parameter and a
 *    fully valid ICommunityPlatformUserAchievement.ICreate request body.
 * 4. Assert that this memberUser-authenticated call fails using
 *    TestValidator.error, because only adminUser actors are allowed to create
 *    achievements through this endpoint.
 * 5. Construct a separate unauthenticated connection (no Authorization header) by
 *    shallow-cloning the base connection and providing an empty headers object
 *    at creation time.
 * 6. Using the unauthenticated connection, repeat the same achievements create
 *    call with the same handle and payload and assert, again with
 *    TestValidator.error, that the call fails due to lack of
 *    authentication/authorization.
 * 7. Because no achievements read/list endpoint is provided in the SDK, we do not
 *    verify persistence directly; instead, we rely on the fact that both calls
 *    must throw and never yield a ICommunityPlatformUserAchievement instance
 *    for non-admin callers.
 */
export async function test_api_admin_profile_achievement_create_reject_non_admin_caller(
  connection: api.IConnection,
) {
  // 1. Register a new memberUser and obtain its authorized context
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As that memberUser, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // Use the member user's username as the profile handle for achievement creation
  const profileHandle: string = memberAuthorized.username;

  // Prepare a valid achievement creation payload
  const achievementCreateBody = {
    code: `karma-${RandomGenerator.alphaNumeric(6)}`,
    category: "karma",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    icon_uri: "https://cdn.example.com/icons/karma.png",
    status: "earned",
    earned_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  // 3. Attempt to create an achievement as memberUser (should fail)
  await TestValidator.error(
    "memberUser actor must not be able to create achievements via admin endpoint",
    async () => {
      await api.functional.communityPlatform.adminUser.profiles.achievements.create(
        connection,
        {
          handle: profileHandle,
          body: achievementCreateBody,
        },
      );
    },
  );

  // 4. Attempt the same call from an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {},
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };

  await TestValidator.error(
    "unauthenticated caller must not be able to create achievements via admin endpoint",
    async () => {
      await api.functional.communityPlatform.adminUser.profiles.achievements.create(
        unauthenticatedConnection,
        {
          handle: profileHandle,
          body: achievementCreateBody,
        },
      );
    },
  );
}
