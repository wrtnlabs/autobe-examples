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
 * Validate public retrieval of a concrete user achievement by profile handle
 * and code.
 *
 * Business goal:
 *
 * - Ensure that once an admin grants a non-revoked, visible achievement to a user
 *   profile identified by a handle, this achievement can be retrieved via the
 *   public GET /communityPlatform/profiles/{handle}/achievements/{code}
 *   endpoint without any authentication, and that the returned DTO matches what
 *   was created.
 *
 * Scenario steps:
 *
 * 1. Register a member user (memberUser.join) which implicitly provisions the
 *    member user and associated profile in the community platform.
 * 2. As that member user, create a community to simulate realistic platform usage
 *    context (not strictly required for the achievement, but aligns with the
 *    domain model, and exercises the memberUser.community creation flow).
 * 3. Register an admin user (adminUser.join) and then perform a login
 *    (adminUser.login) so that the connection is clearly in an adminUser
 *    context with a valid Authorization token.
 * 4. As adminUser, grant a specific achievement to the member user's profile by
 *    calling adminUser.profiles.achievements.create with the member username as
 *    the handle and a chosen achievement code.
 * 5. Using a cloned connection that has no Authorization header (public client),
 *    call profiles.achievements.at(handle, code) with the same handle and
 *    code.
 * 6. Assert that the public GET succeeds and that the returned
 *    ICommunityPlatformUserAchievement:
 *
 *    - Has code, category, title, status, and earned_at equal to the values from the
 *         creation request.
 *    - Has profile.username matching the member user's username.
 *    - Represents a non-revoked, visible achievement (status is the expected visible
 *         state, e.g., "earned").
 * 7. Confirm that this success path does not require authentication by virtue of
 *    using a connection with empty headers.
 */
export async function test_api_profile_achievement_detail_public_view(
  connection: api.IConnection,
) {
  // 1. Register member user (memberUser.join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  const memberUsername: string = memberAuthorized.username;

  // 2. Create a community as the member user
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Register admin user and log in
  const adminUsername = `admin_${RandomGenerator.alphaNumeric(8)}`;
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@admin.test`;
  const adminPassword = "Adm1nP@ssw0rd";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin = await api.functional.auth.adminUser.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(
    adminAuthorizedFromJoin,
  );

  const adminLoginBody = {
    identifier: adminUsername,
    password: adminPassword,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin = await api.functional.auth.adminUser.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(
    adminAuthorizedFromLogin,
  );

  // 4. Grant an achievement to the member user's profile (adminUser context)
  const achievementCode = `karma-${RandomGenerator.alphaNumeric(6)}`;
  const achievementCategory = "karma";
  const achievementTitle = "Karma Milestone";
  const achievementDescription = RandomGenerator.paragraph({ sentences: 4 });
  const achievementIconUri = "https://cdn.example.com/icons/karma.png";
  const earnedAt = new Date().toISOString();

  const achievementCreateBody = {
    code: achievementCode,
    category: achievementCategory,
    title: achievementTitle,
    description: achievementDescription,
    icon_uri: achievementIconUri,
    status: "earned",
    earned_at: earnedAt,
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const createdAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: memberUsername,
        body: achievementCreateBody,
      },
    );
  typia.assert<ICommunityPlatformUserAchievement>(createdAchievement);

  // 5. Prepare a public (unauthenticated) connection without Authorization header
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Publicly retrieve the achievement by handle and code
  const publicAchievement =
    await api.functional.communityPlatform.profiles.achievements.at(
      publicConnection,
      {
        handle: memberUsername,
        code: achievementCode,
      },
    );

  typia.assert<ICommunityPlatformUserAchievement>(publicAchievement);

  // 7. Validate that core fields match between creation and public retrieval
  TestValidator.equals(
    "public achievement code matches created code",
    publicAchievement.code,
    achievementCode,
  );
  TestValidator.equals(
    "public achievement category matches created category",
    publicAchievement.category,
    achievementCategory,
  );
  TestValidator.equals(
    "public achievement title matches created title",
    publicAchievement.title,
    achievementTitle,
  );
  TestValidator.equals(
    "public achievement status remains earned",
    publicAchievement.status,
    achievementCreateBody.status,
  );
  TestValidator.equals(
    "public achievement earned_at matches creation timestamp",
    publicAchievement.earned_at,
    achievementCreateBody.earned_at,
  );

  // 8. Validate profile summary consistency
  TestValidator.equals(
    "public achievement profile username matches member username",
    publicAchievement.profile.username,
    memberUsername,
  );
}
