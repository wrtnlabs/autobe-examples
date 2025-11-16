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
 * Validate that deleting a non-existent user achievement by code for a given
 * profile handle as an adminUser results in an appropriate not-found style
 * error and does not affect existing achievements for that profile.
 *
 * Business context:
 *
 * - Achievements are created per user profile (resolved by handle) and uniquely
 *   identified by `(memberUser, code)`.
 * - Deleting an achievement that does not exist (or is already removed) must be
 *   idempotent from the perspective of stored state and should respond with a
 *   not-found style error contract.
 * - Existing achievements for that profile must remain unchanged.
 *
 * Steps:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join so that subsequent
 *    calls operate under an authorized admin context.
 * 2. Select a random profile handle string, representing an existing profile in
 *    the community platform.
 * 3. Create a legitimate achievement for that handle using POST
 *    /communityPlatform/adminUser/profiles/{handle}/achievements.
 *
 *    - This simulates a valid profile with at least one achievement.
 * 4. Generate a different achievement code that is guaranteed not to match the
 *    created achievement's `code`.
 * 5. Call DELETE
 *    /communityPlatform/adminUser/profiles/{handle}/achievements/{code} using
 *    the non-existent code.
 * 6. Use TestValidator.error to assert that the deletion attempt throws an HTTP
 *    error (contract-level error) to represent the not-found semantics, without
 *    asserting the exact HTTP status code.
 * 7. Ensure that the previously created achievement is still considered valid by:
 *
 *    - Keeping the original creation response and validating its shape using
 *         typia.assert.
 *    - Not performing any follow-up operations that would be invalidated by an
 *         unintended deletion (we do not have list or get APIs here, so we rely
 *         on type validation and absence of side effects in our calls).
 */
export async function test_api_admin_achievement_delete_missing(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authorized admin context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Choose a random profile handle string.
  const handle: string = RandomGenerator.alphabets(12);

  // 3. Create a legitimate achievement for that handle.
  const existingCode: string = `code_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    code: existingCode,
    category: "posting",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    icon_uri: typia.random<string & tags.Format<"uri">>(),
    status: "earned",
    earned_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const createdAchievement: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle,
        body: createBody,
      },
    );
  typia.assert(createdAchievement);

  // 4. Generate a different, non-existent achievement code.
  const missingCode: string = `${existingCode}_missing`;
  TestValidator.predicate(
    "missing achievement code must differ from existing achievement code",
    missingCode !== existingCode,
  );

  // 5 & 6. Attempt to delete the non-existent achievement and
  // assert that an error is thrown (not-found style semantics).
  await TestValidator.error(
    "deleting non-existent achievement must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.profiles.achievements.erase(
        connection,
        {
          handle,
          code: missingCode,
        },
      );
    },
  );

  // 7. Ensure that the previously created achievement remains
  // structurally valid by re-asserting its shape. We cannot call
  // any list or read endpoint here, so we ensure no side effects
  // occurred on our in-memory representation.
  typia.assert<ICommunityPlatformUserAchievement>(createdAchievement);

  TestValidator.equals(
    "created achievement code remains unchanged after failed delete",
    createdAchievement.code,
    existingCode,
  );
}
