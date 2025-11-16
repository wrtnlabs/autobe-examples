import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_profile_update_email(
  connection: api.IConnection,
) {
  // Step 1: Create initial user account
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const originalUser = await api.functional.auth.user.join(connection, {
    body: {
      email: initialEmail,
      password: "TestPassword123",
      href: "https://example.com/profile",
      referrer: "https://example.com/register",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(originalUser);

  // Step 2: Update email to new valid address
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedUser = await api.functional.todoApp.user.auth.profile.update(
    connection,
    {
      body: {
        email: newEmail,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedUser);

  TestValidator.equals("email should be updated", updatedUser.email, newEmail);
  TestValidator.notEquals(
    "email should be different from original",
    updatedUser.email,
    initialEmail,
  );

  // Step 3: Verify email format validation with invalid email
  await TestValidator.error("invalid email format should fail", async () => {
    await api.functional.todoApp.user.auth.profile.update(connection, {
      body: {
        email: "invalid-email-format",
      } satisfies ITodoAppUser.IUpdate,
    });
  });

  // Step 4: Create second user to test uniqueness constraint
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword456",
      href: "https://example.com/profile",
      referrer: "https://example.com/register",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondUser);

  // Step 5: Test email uniqueness constraint
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.todoApp.user.auth.profile.update(connection, {
      body: {
        email: secondUser.email, // Try to use second user's email
      } satisfies ITodoAppUser.IUpdate,
    });
  });

  // Step 6: Verify session continuity by accessing profile with updated email
  const profileCheck = await api.functional.todoApp.user.auth.profile.update(
    connection,
    {
      body: {},
    },
  );
  typia.assert(profileCheck);
  TestValidator.equals(
    "profile should maintain session",
    profileCheck.email,
    newEmail,
  );
}
