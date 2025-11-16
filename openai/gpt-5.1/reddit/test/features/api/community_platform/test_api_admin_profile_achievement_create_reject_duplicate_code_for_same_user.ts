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
 * Ensure adminUser achievement creation rejects duplicate codes per user
 * profile.
 *
 * Business workflow:
 *
 * 1. Register a memberUser so that a valid account and implicit profile exist.
 * 2. As that memberUser, create a community to simulate active participation.
 * 3. Register an adminUser and then log in as that adminUser so the connection
 *    carries admin authorization.
 * 4. As adminUser, create an achievement with a specific code for a deterministic
 *    profile handle derived from the member user's username.
 * 5. Attempt to create another achievement with the same code for the same handle
 *    and assert that this second request fails, reflecting enforcement of the
 *
 * @@unique([community_platform_memberuser_id,
 */
export async function test_api_admin_profile_achievement_create_reject_duplicate_code_for_same_user(
  connection: api.IConnection,
) {
  // 1. memberUser joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as memberUser to simulate active usage
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // We don't have an API to fetch the profile handle, so we will derive
  // a deterministic handle from the member's username and reuse it.
  const profileHandle: string = memberAuthorized.username;

  // 3. Register an adminUser
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoinResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinResult);

  // 4. Login as adminUser to ensure fresh admin session / token
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorized);

  // 5. Create first achievement for the derived profile handle
  const achievementCode = "karma-1000";

  const firstAchievementBody = {
    code: achievementCode,
    category: "karma",
    title: "Karma 1000",
    description: "Reached 1000 karma points on the platform.",
    icon_uri: "https://cdn.example.com/icons/karma-1000.png",
    status: "earned",
    earned_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const firstAchievement: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: profileHandle,
        body: firstAchievementBody,
      },
    );
  typia.assert(firstAchievement);

  TestValidator.equals(
    "first achievement code should match request code",
    firstAchievement.code,
    achievementCode,
  );
  TestValidator.equals(
    "first achievement status should match request status",
    firstAchievement.status,
    firstAchievementBody.status,
  );

  // 6. Attempt to create a second achievement with the same code for the same handle
  const secondAchievementBody = {
    code: achievementCode,
    category: "karma",
    title: "Karma 1000 (duplicate)",
    description: "Duplicate attempt for the same karma milestone.",
    icon_uri: "https://cdn.example.com/icons/karma-1000-duplicate.png",
    status: "earned",
    earned_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  await TestValidator.error(
    "duplicate achievement code for same profile should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.profiles.achievements.create(
        connection,
        {
          handle: profileHandle,
          body: secondAchievementBody,
        },
      );
    },
  );
}
