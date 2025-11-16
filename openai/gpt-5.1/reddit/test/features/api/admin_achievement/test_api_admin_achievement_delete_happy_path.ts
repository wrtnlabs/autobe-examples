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
 * Validate happy-path deletion of an admin-managed user achievement.
 *
 * Business flow:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join to obtain an
 *    authenticated admin context.
 * 2. Use a synthetic profile handle value to represent an existing profile (the
 *    backend simulation will accept it).
 * 3. As the authenticated adminUser, create an achievement for that handle via
 *    POST /communityPlatform/adminUser/profiles/{handle}/achievements.
 * 4. Delete the same achievement via DELETE
 *    /communityPlatform/adminUser/profiles/{handle}/achievements/{code}.
 * 5. Attempt to delete the same achievement again and ensure an error is raised,
 *    demonstrating idempotent external behavior for already-deleted records.
 *
 * Due to the limited SDK surface provided to this test, we cannot perform a
 * direct read-after-delete verification. Instead, the test focuses on ensuring
 * that the first deletion succeeds without error and that subsequent deletions
 * for the same (handle, code) pair fail, which is consistent with the not-found
 * semantics described in the endpoint docs.
 */
export async function test_api_admin_achievement_delete_happy_path(
  connection: api.IConnection,
) {
  // 1. Establish adminUser context via join
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a synthetic profile handle
  const profileHandle: string = RandomGenerator.alphabets(10);

  // 3. Create a user achievement for that handle
  const achievementBody = {
    code: RandomGenerator.alphaNumeric(12),
    category: RandomGenerator.alphabets(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    icon_uri: typia.random<string & tags.Format<"uri">>(),
    status: "earned",
    earned_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const created: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: profileHandle,
        body: achievementBody,
      },
    );
  typia.assert(created);

  // Sanity check: the created achievement should reflect the requested handle and code
  TestValidator.equals(
    "created achievement code must match request",
    created.code,
    achievementBody.code,
  );
  TestValidator.equals(
    "created achievement status must match request",
    created.status,
    achievementBody.status,
  );

  // 4. Delete the achievement once (expected success, no error)
  await api.functional.communityPlatform.adminUser.profiles.achievements.erase(
    connection,
    {
      handle: profileHandle,
      code: achievementBody.code,
    },
  );

  // 5. Delete the same achievement again (expected error / not-found semantics)
  await TestValidator.error(
    "second delete on same achievement should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.profiles.achievements.erase(
        connection,
        {
          handle: profileHandle,
          code: achievementBody.code,
        },
      );
    },
  );
}
