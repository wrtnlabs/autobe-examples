import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test attempted retrieval of another user's profile information. Validates
 * that the system enforces strict access controls preventing users from
 * accessing profiles that don't belong to them. This tests the security
 * implementation that ensures users can only view their own account data for
 * privacy protection and data isolation.
 */
export async function test_api_user_profile_retrieval_other_user_id(
  connection: api.IConnection,
) {
  // Step 1: Create first user account
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "securePassword123",
      name: RandomGenerator.name(),
      href: typia.random<
        string & tags.Format<"uri"> & tags.MinLength<10> & tags.MaxLength<2048>
      >(),
      referrer: typia.random<
        string & tags.Format<"uri"> & tags.MinLength<10> & tags.MaxLength<2048>
      >(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(firstUser);

  // Step 2: Create second user account to establish another user's profile
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "anotherSecurePassword456",
      name: RandomGenerator.name(),
      href: typia.random<
        string & tags.Format<"uri"> & tags.MinLength<10> & tags.MaxLength<2048>
      >(),
      referrer: typia.random<
        string & tags.Format<"uri"> & tags.MinLength<10> & tags.MaxLength<2048>
      >(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(secondUser);

  // Step 3: Attempt to access second user's profile using first user's authentication
  // This should fail due to access control restrictions
  await TestValidator.error(
    "accessing another user's profile should fail",
    async () => {
      await api.functional.todoApp.user.users.at(connection, {
        userId: secondUser.id,
      });
    },
  );

  // Step 4: Verify that first user can still access their own profile successfully
  const firstUserProfile = await api.functional.todoApp.user.users.at(
    connection,
    {
      userId: firstUser.id,
    },
  );
  typia.assert(firstUserProfile);
  TestValidator.equals(
    "first user can access own profile",
    firstUserProfile.id,
    firstUser.id,
  );
  TestValidator.equals(
    "first user profile has correct email",
    firstUserProfile.email,
    firstUserEmail,
  );
}
