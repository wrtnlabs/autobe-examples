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
 * Ensure that updating an achievement for one profile does not affect another
 * profile that has an achievement with the same code.
 *
 * Business context
 *
 * - Achievements are stored in community_platform_user_achievements with a
 *   uniqueness constraint on (community_platform_memberuser_id, code).
 * - This means different users (different profiles) may share the same
 *   achievement code, but for each user that code should be unique.
 * - Admin tools must be able to create and update achievements per profile
 *   without cross-contaminating other users’ records.
 *
 * Test steps
 *
 * 1. Register an adminUser via POST /auth/adminUser/join to obtain an authorized
 *    admin session. The SDK automatically wires the JWT into the IConnection,
 *    so subsequent admin endpoints can be called.
 * 2. Prepare two distinct profile handles, `handleA` and `handleB`, using random
 *    strings. These conceptually represent two different member users. The test
 *    relies on the backend/simulator to resolve them.
 * 3. Create an achievement for `handleA` using POST
 *    /communityPlatform/adminUser/profiles/{handle}/achievements with a fixed
 *    code like `CODE_SHARED` and some initial metadata (category, title,
 *    description, status, icon_uri, earned_at).
 * 4. Create a second achievement for `handleB` using the same code `CODE_SHARED`
 *    but different metadata (at least title and description) so we can later
 *    detect unintended changes.
 * 5. Update only `handleA`’s achievement via PUT
 *    /communityPlatform/adminUser/profiles/{handle}/achievements/{code} using
 *    ICommunityPlatformUserAchievement.IUpdate. Change values for fields like
 *    title, description, status, icon_uri, and optionally revoked_at.
 * 6. Validate that the response of the update call reflects the new metadata for
 *    `handleA`’s achievement and that typia.assert passes.
 * 7. Independently, confirm that `handleB`’s previously created achievement
 *    instance (as returned from its own create call) remains unchanged:
 *
 *    - Use TestValidator.notEquals on the relevant fields between handleA’s updated
 *         achievement and handleB’s original achievement to verify they diverge
 *         after the update.
 *    - Use TestValidator.equals to verify that handleB’s fields still match the
 *         originally provided values, proving update-by-handle scoping works
 *         correctly.
 * 8. Optionally, demonstrate that a further update to `handleB` with the same code
 *    continues to work, reinforcing that uniqueness is per (memberUser, code)
 *    rather than globally per code.
 */
export async function test_api_admin_achievement_update_for_different_profile(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and establish an authorized connection context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare two distinct profile handles
  const handleA: string = RandomGenerator.alphaNumeric(12);
  const handleB: string = RandomGenerator.alphaNumeric(12);

  // 3. Create an achievement for handleA with a shared code
  const sharedCode: string = "CODE_SHARED";

  const createBodyA = {
    code: sharedCode,
    category: "posting",
    title: "Original Title A",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    icon_uri: typia.random<string & tags.Format<"uri">>(),
    status: "earned",
    earned_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const achievementAOriginal: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: handleA,
        body: createBodyA,
      },
    );
  typia.assert(achievementAOriginal);

  // 4. Create an achievement for handleB with the same code but different metadata
  const createBodyB = {
    code: sharedCode,
    category: "karma",
    title: "Original Title B",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_uri: typia.random<string & tags.Format<"uri">>(),
    status: "earned",
    earned_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const achievementBOriginal: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: handleB,
        body: createBodyB,
      },
    );
  typia.assert(achievementBOriginal);

  // 5. Update only handleA's achievement
  const updateBodyA = {
    status: "revoked",
    title: "Updated Title A",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    icon_uri: typia.random<string & tags.Format<"uri">>(),
    revoked_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.IUpdate;

  const achievementAUpdated: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.update(
      connection,
      {
        handle: handleA,
        code: sharedCode,
        body: updateBodyA,
      },
    );
  typia.assert(achievementAUpdated);

  // 6. Validate that handleA's achievement reflects the update
  TestValidator.equals(
    "handleA achievement status should be updated to revoked",
    updateBodyA.status,
    achievementAUpdated.status,
  );
  TestValidator.equals(
    "handleA achievement title should be updated",
    updateBodyA.title,
    achievementAUpdated.title,
  );
  TestValidator.equals(
    "handleA achievement description should be updated",
    updateBodyA.description,
    achievementAUpdated.description,
  );
  TestValidator.equals(
    "handleA achievement icon_uri should be updated",
    updateBodyA.icon_uri,
    achievementAUpdated.icon_uri,
  );
  TestValidator.equals(
    "handleA achievement revoked_at should be updated",
    updateBodyA.revoked_at,
    achievementAUpdated.revoked_at,
  );

  // 7. Verify that handleB's achievement remains unchanged as per original create body
  TestValidator.equals(
    "handleB achievement code should remain sharedCode",
    sharedCode,
    achievementBOriginal.code,
  );
  TestValidator.equals(
    "handleB achievement title should remain original",
    createBodyB.title,
    achievementBOriginal.title,
  );
  TestValidator.equals(
    "handleB achievement description should remain original",
    createBodyB.description,
    achievementBOriginal.description,
  );
  TestValidator.equals(
    "handleB achievement status should remain original",
    createBodyB.status,
    achievementBOriginal.status,
  );
  TestValidator.equals(
    "handleB achievement icon_uri should remain original",
    createBodyB.icon_uri,
    achievementBOriginal.icon_uri,
  );

  // Additionally ensure that A and B are distinct even though they share the same code
  TestValidator.notEquals(
    "handleA and handleB achievements should differ after update",
    achievementAUpdated.title,
    achievementBOriginal.title,
  );
}
