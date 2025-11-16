import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that an authenticated user can update their own email and password
 * fields.
 *
 * Workflow:
 *
 * 1. Register user and obtain authentication
 * 2. Update the user's email to a new unique, valid email
 * 3. Update the user's password to a new valid value (policy: min 8 chars)
 * 4. Verify changes reflected in response
 * 5. Attempt to update email to already existing email (expect error)
 * 6. Attempt to update email with invalid format (expect error)
 */
export async function test_api_user_update_account_email_password(
  connection: api.IConnection,
) {
  // 1. Register baseline user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const join1 = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(join1);

  // 2. Update email to a new random valid, unique email
  const updatedEmail: string = typia.random<string & tags.Format<"email">>();
  const updateRes1 = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: join1.id,
      body: {
        email: updatedEmail,
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(updateRes1);
  TestValidator.equals(
    "update email reflected",
    updateRes1.email,
    updatedEmail,
  );
  TestValidator.equals("other fields unmodified", updateRes1.id, join1.id);

  // 3. Update password to a new valid value
  const updatedPassword: string = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const updateRes2 = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: join1.id,
      body: {
        password: updatedPassword,
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(updateRes2);
  TestValidator.equals(
    "update password does not change email",
    updateRes2.email,
    updatedEmail,
  );
  TestValidator.equals(
    "id does not change on password update",
    updateRes2.id,
    join1.id,
  );

  // 4. Register a second user for uniqueness check
  const otherEmail: string = typia.random<string & tags.Format<"email">>();
  const join2 = await api.functional.auth.user.join(connection, {
    body: {
      email: otherEmail,
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(join2);

  // 5. Attempt to update email to an existing email (should fail)
  await TestValidator.error("duplicate email update rejected", async () => {
    await api.functional.todoList.user.users.update(connection, {
      userId: join1.id,
      body: {
        email: otherEmail,
      } satisfies ITodoListUser.IUpdate,
    });
  });

  // 6. Attempt to update email to invalid format (should fail)
  await TestValidator.error(
    "invalid format email update rejected",
    async () => {
      await api.functional.todoList.user.users.update(connection, {
        userId: join1.id,
        body: {
          email: "invalid-email-format",
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // 7. Attempt to update with neither field (should fail)
  await TestValidator.error("update without fields rejected", async () => {
    await api.functional.todoList.user.users.update(connection, {
      userId: join1.id,
      body: {} satisfies ITodoListUser.IUpdate,
    });
  });
}
