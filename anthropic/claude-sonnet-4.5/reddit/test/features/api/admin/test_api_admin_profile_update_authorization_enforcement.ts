import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test profile update authorization enforcement for admin users.
 *
 * This test validates that the profile update operation strictly enforces
 * ownership validation, preventing administrators from updating other users'
 * profiles despite their elevated platform privileges. It creates two separate
 * admin accounts - one as the profile owner and another as the requesting
 * admin
 *
 * - Then attempts to have the second admin update the first admin's profile.
 *
 * Test workflow:
 *
 * 1. Create first admin account (profile owner)
 * 2. Create second admin account (unauthorized admin)
 * 3. Attempt to update first admin's profile while authenticated as second admin
 * 4. Verify the operation rejects with a permission error
 *
 * This confirms that profile editing is restricted solely to the profile owner,
 * with moderators and administrators having no special privileges for editing
 * other users' profiles.
 */
export async function test_api_admin_profile_update_authorization_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create first admin account (the profile owner)
  const firstAdminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const firstAdmin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: firstAdminData,
    });
  typia.assert(firstAdmin);

  // Step 2: Create second admin account (the unauthorized admin)
  const secondAdminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const secondAdmin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: secondAdminData,
    });
  typia.assert(secondAdmin);

  // Step 3: Attempt to update first admin's profile while authenticated as second admin
  // The second admin's token is already set in connection.headers from the join call
  const unauthorizedUpdateData = {
    profile_bio: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    avatar_url: typia.random<string>(),
  } satisfies IRedditLikeUser.IProfileUpdate;

  // Step 4: Verify the operation rejects with a permission error
  await TestValidator.error(
    "second admin cannot update first admin's profile",
    async () => {
      await api.functional.redditLike.admin.users.profile.update(connection, {
        userId: firstAdmin.id,
        body: unauthorizedUpdateData,
      });
    },
  );
}
