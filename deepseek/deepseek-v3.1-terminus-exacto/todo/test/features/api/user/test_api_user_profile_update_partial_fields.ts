import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test partial user profile updates where only specific fields are modified
 * while others remain unchanged. This test validates that users can update
 * individual profile attributes like display name without affecting other
 * fields, and that optional field handling works correctly when some update
 * fields are omitted.
 */
export async function test_api_user_profile_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const userName = RandomGenerator.name();

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: userName,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Perform partial profile update with only name field
  const updatedName = RandomGenerator.name();
  const partialUpdateName = await api.functional.todoApp.user.users.update(
    connection,
    {
      userEmail: userEmail,
      body: {
        name: updatedName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(partialUpdateName);

  // Step 3: Verify that only name was updated, other fields remain unchanged
  TestValidator.equals(
    "email should remain unchanged",
    partialUpdateName.email,
    createdUser.email,
  );
  TestValidator.equals(
    "status should remain unchanged",
    partialUpdateName.status,
    createdUser.status,
  );
  TestValidator.equals(
    "name should be updated",
    partialUpdateName.name,
    updatedName,
  );

  // Step 4: Perform another partial update with only status field
  const updatedStatus = "active";
  const partialUpdateStatus = await api.functional.todoApp.user.users.update(
    connection,
    {
      userEmail: userEmail,
      body: {
        status: updatedStatus,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(partialUpdateStatus);

  // Step 5: Verify that only status was updated, name and email remain unchanged
  TestValidator.equals(
    "email should remain unchanged after status update",
    partialUpdateStatus.email,
    createdUser.email,
  );
  TestValidator.equals(
    "name should remain unchanged after status update",
    partialUpdateStatus.name,
    updatedName,
  );
  TestValidator.equals(
    "status should be updated",
    partialUpdateStatus.status,
    updatedStatus,
  );

  // Step 6: Perform partial update with password field
  const newPassword = "newPassword456";
  const partialUpdatePassword = await api.functional.todoApp.user.users.update(
    connection,
    {
      userEmail: userEmail,
      body: {
        password: newPassword,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(partialUpdatePassword);

  // Step 7: Verify that password update doesn't affect other fields
  TestValidator.equals(
    "email should remain unchanged after password update",
    partialUpdatePassword.email,
    createdUser.email,
  );
  TestValidator.equals(
    "name should remain unchanged after password update",
    partialUpdatePassword.name,
    updatedName,
  );
  TestValidator.equals(
    "status should remain unchanged after password update",
    partialUpdatePassword.status,
    updatedStatus,
  );

  // Step 8: Test partial update with multiple fields
  const finalName = RandomGenerator.name();
  const finalStatus = "verified";
  const multiFieldUpdate = await api.functional.todoApp.user.users.update(
    connection,
    {
      userEmail: userEmail,
      body: {
        name: finalName,
        status: finalStatus,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(multiFieldUpdate);

  // Step 9: Verify multi-field update
  TestValidator.equals(
    "email should remain unchanged after multi-field update",
    multiFieldUpdate.email,
    createdUser.email,
  );
  TestValidator.equals(
    "name should be updated in multi-field update",
    multiFieldUpdate.name,
    finalName,
  );
  TestValidator.equals(
    "status should be updated in multi-field update",
    multiFieldUpdate.status,
    finalStatus,
  );
}
