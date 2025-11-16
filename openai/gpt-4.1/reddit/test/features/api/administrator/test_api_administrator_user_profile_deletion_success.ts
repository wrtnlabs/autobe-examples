import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Verifies that an administrator can successfully delete a user account by
 * userId.
 *
 * Test Steps:
 *
 * 1. Register a new administrator account (authenticate for deletion authority)
 * 2. Generate a test userId to target for deletion (fixture or random UUID)
 * 3. Call the /communityPlatform/administrator/users/{userId} delete endpoint as
 *    administrator
 * 4. Assert that deletion completes without error (void response)
 * 5. (Omit further validation since no user profile/list endpoints are available)
 */
export async function test_api_administrator_user_profile_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Prepare a random userId (simulate a user fixture, since no user create/read APIs are present)
  const userId = typia.random<string & tags.Format<"uuid">>();

  // 3. Invoke the delete endpoint as administrator
  await api.functional.communityPlatform.administrator.users.erase(connection, {
    userId,
  });
}
