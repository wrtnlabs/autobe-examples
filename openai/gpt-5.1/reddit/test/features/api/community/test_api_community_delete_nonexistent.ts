import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate deletion behavior for non-existent communities as a platform admin.
 *
 * Business purpose: Ensure that when a platform administrator attempts to
 * delete a community that does not exist, the system responds with an error
 * (e.g., not-found) rather than treating the operation as a successful
 * deletion, and that such failed attempts do not corrupt authentication or
 * other global state.
 *
 * Steps:
 *
 * 1. Register a first platform administrator using POST /auth/platformAdmin/join.
 *
 *    - This also establishes an authenticated session via JWT token handling in the
 *         SDK.
 * 2. Attempt to DELETE
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier} with a
 *    random, presumably non-existent identifier and assert that an error is
 *    thrown.
 * 3. Repeat the DELETE attempt with another random identifier to confirm
 *    consistent error behavior.
 * 4. Register a second platform administrator via another join call to ensure that
 *    previous failed deletes did not break subsequent authenticated flows.
 */
export async function test_api_community_delete_nonexistent(
  connection: api.IConnection,
) {
  // 1. Register first platform administrator and establish authentication
  const firstJoinInput = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const firstAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: firstJoinInput,
    });
  typia.assert(firstAdmin);

  // 2. Attempt to delete a clearly synthetic, non-existent community
  const nonExistentCommunityId: string = RandomGenerator.alphaNumeric(32);
  await TestValidator.error(
    "delete non-existent community must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.erase(
        connection,
        {
          communityIdentifier: nonExistentCommunityId,
        },
      );
    },
  );

  // 3. Repeat with another random identifier to check consistent behavior
  const anotherNonExistentCommunityId: string =
    RandomGenerator.alphaNumeric(40);
  await TestValidator.error(
    "repeat delete on another non-existent community must also fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.erase(
        connection,
        {
          communityIdentifier: anotherNonExistentCommunityId,
        },
      );
    },
  );

  // 4. Register a second platform administrator to ensure system remains healthy
  const secondJoinInput = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const secondAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: secondJoinInput,
    });
  typia.assert(secondAdmin);
}
