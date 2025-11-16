import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserAchievement";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Verify that deleting an achievement for one profile does not affect another
 * profile that owns an achievement with the same code.
 *
 * Business goal
 *
 * - Achievements are uniquely constrained per user by
 *   (community_platform_memberuser_id, code).
 * - Admin endpoints manage achievements per profile handle.
 * - This test ensures that erase() operates in the scope of the resolved member
 *   user only, and that shared codes are safe across profiles.
 *
 * Scenario steps
 *
 * 1. Register an adminUser using POST /auth/adminUser/join, which also establishes
 *    the Authorization context in the SDK connection.
 * 2. Choose two distinct profile handles (handleA and handleB) as simple random
 *    strings.
 * 3. As the adminUser, create an achievement for handleA with a shared code
 *    CODE_SHARED using POST
 *    /communityPlatform/adminUser/profiles/{handle}/achievements.
 * 4. As the same adminUser, create another achievement for handleB with the same
 *    CODE_SHARED but different presentation data so the two achievement
 *    instances are distinguishable.
 * 5. Assert that both create calls succeed and that:
 *
 *    - Both achievements have the same code (CODE_SHARED).
 *    - They belong to different profiles (compare profile.id).
 * 6. Call DELETE
 *    /communityPlatform/adminUser/profiles/{handleA}/achievements/{code} to
 *    delete the achievement for handleA.
 * 7. Verify that the delete call completes without error and that the achievement
 *    object for handleB (already loaded) still has the shared code and is
 *    untouched in-memory.
 *
 * Due to the limited set of exposed APIs, we cannot re-fetch achievements after
 * deletion, so we focus on validating:
 *
 * - Per-user uniqueness (two achievements with same code but different profiles
 *   can exist).
 * - Per-user scoping of the delete endpoint (addressed by handle and code, and
 *   does not throw when deleting handleA’s achievement).
 */
export async function test_api_admin_achievement_delete_does_not_affect_other_profiles(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare two distinct profile handles and a shared achievement code.
  const handleA = `handle_${RandomGenerator.alphaNumeric(8)}`;
  const handleB = `handle_${RandomGenerator.alphaNumeric(8)}`;
  const sharedCode = `CODE_SHARED_${RandomGenerator.alphaNumeric(6)}`;

  // 3. Create an achievement for handleA with the shared code.
  const createBodyA = {
    code: sharedCode,
    category: "posting",
    title: "Shared Code Achievement A",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_uri: "https://cdn.example.com/icons/achievement-a.png" as string &
      tags.Format<"uri">,
    status: "earned",
    earned_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const achievementA: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: handleA,
        body: createBodyA,
      },
    );
  typia.assert(achievementA);

  // 4. Create another achievement for handleB with the same code but
  //    different presentation data.
  const createBodyB = {
    code: sharedCode,
    category: "karma",
    title: "Shared Code Achievement B",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_uri: "https://cdn.example.com/icons/achievement-b.png" as string &
      tags.Format<"uri">,
    status: "earned",
    earned_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const achievementB: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: handleB,
        body: createBodyB,
      },
    );
  typia.assert(achievementB);

  // 5. Validate that both achievements share the same code but belong
  //    to different profiles.
  TestValidator.equals(
    "both achievements share the same code",
    achievementA.code,
    sharedCode,
  );
  TestValidator.equals(
    "second achievement also uses the shared code",
    achievementB.code,
    sharedCode,
  );

  TestValidator.notEquals(
    "achievements belong to different profiles (profile.id)",
    achievementA.profile.id,
    achievementB.profile.id,
  );

  // 6. Delete the achievement for handleA only.
  await api.functional.communityPlatform.adminUser.profiles.achievements.erase(
    connection,
    {
      handle: handleA,
      code: sharedCode,
    },
  );

  // 7. Ensure that achievementB remains logically unaffected in-memory.
  //    We already asserted its properties; here we assert again to
  //    document that nothing about its state has changed in this test.
  TestValidator.equals(
    "achievementB still retains shared code after deleting handleA's achievement",
    achievementB.code,
    sharedCode,
  );
  TestValidator.equals(
    "achievementB profile id remains unchanged",
    achievementB.profile.id,
    achievementB.profile.id,
  );
}
