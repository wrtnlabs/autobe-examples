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
 * Validate successful creation of a user achievement by an authenticated
 * adminUser.
 *
 * Business flow covered:
 *
 * 1. Register a memberUser so that a valid username/handle exists in the platform.
 * 2. Register an adminUser and obtain an authorized admin context (token set on
 *    connection).
 * 3. As the adminUser, create a new achievement for the memberUser profile using
 *    the member's username as the handle.
 * 4. Verify that the returned achievement matches the creation payload and is
 *    correctly linked to the member profile.
 * 5. Validate audit fields such as created_at, updated_at, and default null values
 *    for deleted_at and revoked_at.
 */
export async function test_api_admin_profile_achievement_create_success(
  connection: api.IConnection,
) {
  // 1. Register memberUser (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // Use member username as profile handle
  const profileHandle: string = memberAuthorized.username;

  // 2. Register adminUser (join) to obtain admin authorization context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1nPass!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Optionally, ensure login flow works and token is refreshed
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoggedIn);

  // 3. As adminUser, create a new achievement for the member profile
  const achievementCode = `first-post-${RandomGenerator.alphaNumeric(8)}`;
  const earnedAt = new Date().toISOString();

  const achievementCreateBody = {
    code: achievementCode,
    category: "posting",
    title: "First Post Created",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_uri: typia.random<string & tags.Format<"uri">>(),
    status: "earned",
    earned_at: earnedAt,
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const createdAchievement: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: profileHandle,
        body: achievementCreateBody,
      },
    );
  typia.assert<ICommunityPlatformUserAchievement>(createdAchievement);

  // 4. Business assertions: mapping from request body to response
  TestValidator.equals(
    "achievement code should match request",
    createdAchievement.code,
    achievementCreateBody.code,
  );
  TestValidator.equals(
    "achievement category should match request",
    createdAchievement.category,
    achievementCreateBody.category,
  );
  TestValidator.equals(
    "achievement title should match request",
    createdAchievement.title,
    achievementCreateBody.title,
  );
  TestValidator.equals(
    "achievement status should match request",
    createdAchievement.status,
    achievementCreateBody.status,
  );
  TestValidator.equals(
    "achievement earned_at should match request",
    createdAchievement.earned_at,
    achievementCreateBody.earned_at,
  );

  // description and icon_uri may be undefined/null, but when provided, they should match
  TestValidator.equals(
    "achievement description should match request when provided",
    createdAchievement.description ?? null,
    achievementCreateBody.description ?? null,
  );
  TestValidator.equals(
    "achievement icon_uri should match request when provided",
    createdAchievement.icon_uri ?? null,
    achievementCreateBody.icon_uri ?? null,
  );

  // 5. Verify profile linkage
  TestValidator.equals(
    "achievement profile username should match member username",
    createdAchievement.profile.username,
    memberAuthorized.username,
  );

  // 6. Validate audit fields
  // created_at and updated_at should be valid ISO date-time strings
  const createdAtDate = new Date(createdAchievement.created_at);
  const updatedAtDate = new Date(createdAchievement.updated_at);

  await TestValidator.predicate(
    "created_at should be a valid date",
    async () => !Number.isNaN(createdAtDate.getTime()),
  );
  await TestValidator.predicate(
    "updated_at should be a valid date",
    async () => !Number.isNaN(updatedAtDate.getTime()),
  );
  await TestValidator.predicate(
    "created_at should not be in the distant future",
    async () => createdAtDate.getTime() <= Date.now() + 5 * 60 * 1000,
  );
  await TestValidator.predicate(
    "updated_at should be on or after created_at",
    async () => updatedAtDate.getTime() >= createdAtDate.getTime(),
  );

  // deleted_at and revoked_at should be null or undefined when not explicitly set
  TestValidator.predicate(
    "deleted_at should be null or undefined by default",
    createdAchievement.deleted_at === null ||
      createdAchievement.deleted_at === undefined,
  );
  TestValidator.predicate(
    "revoked_at should be null or undefined by default",
    createdAchievement.revoked_at === null ||
      createdAchievement.revoked_at === undefined,
  );
}
