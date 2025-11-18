import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the authenticated user profile update workflow via
 * /todoList/user/users/me (PUT).
 *
 * Steps:
 *
 * 1. Register a new user via /auth/user/join with a unique email, password, and
 *    display_name.
 * 2. The registration sets is_verified to false and is_active to true, but for the
 *    test, we use the token returned directly for immediate authentication.
 * 3. Log in as the new user using the implicit token from the join to simulate
 *    authentication.
 * 4. Update the user's display_name with a new valid value using
 *    /todoList/user/users/me (PUT).
 * 5. Confirm profile change by:
 *
 *    - Verifying updated display_name
 *    - Verifying that email, id, is_verified, is_active, created_at are NOT changed
 *    - Confirming updated_at is changed
 *    - Confirming deleted_at remains unchanged (null or undefined)
 * 6. Test display_name edge cases (min/max length allowed by schema).
 * 7. Attempt profile update with no authentication (should be denied).
 */
export async function test_api_user_profile_update_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });
  const joinBody = {
    email,
    password,
    display_name: displayName as string &
      tags.MinLength<1> &
      tags.MaxLength<64>,
    href: "https://test-e2e.local/register",
    referrer: "https://test-e2e.local/",
  } satisfies ITodoListUser.IJoin;
  const joinResult = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResult);
  const {
    id,
    email: initialEmail,
    display_name: initialDisplayName,
    is_active: initialIsActive,
    is_verified: initialIsVerified,
    created_at: initialCreatedAt,
    updated_at: initialUpdatedAt,
    deleted_at: initialDeletedAt,
    token,
  } = joinResult;
  // Step 2: Token is already set on the connection for authenticated context
  // Step 3: Prepare updated display name
  const updatedDisplayName = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 20,
  });
  // Step 4: Update the profile
  const updateBody = {
    display_name: updatedDisplayName as string &
      tags.MinLength<1> &
      tags.MaxLength<100>,
  } satisfies ITodoListUser.IUpdate;
  const updatedProfile = await api.functional.todoList.user.users.me.update(
    connection,
    { body: updateBody },
  );
  typia.assert(updatedProfile);
  // Step 5: Validate the update
  TestValidator.equals("user id remains unchanged", updatedProfile.id, id);
  TestValidator.equals(
    "email remains unchanged",
    updatedProfile.email,
    initialEmail,
  );
  TestValidator.equals(
    "display_name was updated",
    updatedProfile.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "is_verified was not changed",
    updatedProfile.is_verified,
    initialIsVerified,
  );
  TestValidator.equals(
    "is_active was not changed",
    updatedProfile.is_active,
    initialIsActive,
  );
  TestValidator.equals(
    "created_at was not changed",
    updatedProfile.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at has changed after update",
    updatedProfile.updated_at,
    initialUpdatedAt,
  );
  TestValidator.equals(
    "deleted_at remains unchanged",
    updatedProfile.deleted_at,
    initialDeletedAt,
  );
  // Step 6: Test min/max boundary for display_name
  const minDisplayName = RandomGenerator.alphabets(1);
  const maxDisplayName = RandomGenerator.alphabets(100);
  let boundaryProfile = await api.functional.todoList.user.users.me.update(
    connection,
    {
      body: {
        display_name: minDisplayName as string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
      },
    },
  );
  typia.assert(boundaryProfile);
  TestValidator.equals(
    "display_name accepts min 1 char",
    boundaryProfile.display_name,
    minDisplayName,
  );
  boundaryProfile = await api.functional.todoList.user.users.me.update(
    connection,
    {
      body: {
        display_name: maxDisplayName as string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
      },
    },
  );
  typia.assert(boundaryProfile);
  TestValidator.equals(
    "display_name accepts max 100 chars",
    boundaryProfile.display_name,
    maxDisplayName,
  );
  // Step 7: Attempt update with unauthenticated connection (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("update must require authentication", async () => {
    await api.functional.todoList.user.users.me.update(unauthConn, {
      body: {
        display_name: "Should fail" as string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
      },
    });
  });
}
