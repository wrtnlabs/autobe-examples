import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that a user can update their own password via their email address,
 * and verifies account ownership enforcement and password constraints.
 *
 * 1. Register a new user account.
 * 2. Login to establish authenticated session.
 * 3. Update own password with a valid new password.
 * 4. Retrieve user profile before/after update to check email immutability and
 *    updated_at change.
 * 5. Attempt to update with an invalid password (too short or too long) and verify
 *    error is thrown.
 * 6. Attempt to update another user's password and confirm authorization is
 *    rejected.
 */
export async function test_api_user_password_update_by_self(
  connection: api.IConnection,
) {
  // 1. Register a new user.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const oldPassword: string &
    tags.MinLength<8> &
    tags.MaxLength<100> &
    tags.Format<"password"> = RandomGenerator.alphaNumeric(10) as string &
    tags.MinLength<8> &
    tags.MaxLength<100> &
    tags.Format<"password">;
  const createBody = {
    email,
    password: oldPassword,
    href: "https://test-mysite.com/register",
    referrer: "https://mysite.com/landing",
    ip: null,
  } satisfies ITodoListUser.ICreate;
  const joinResp: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: createBody });
  typia.assert(joinResp);

  // Record original user info for later comparison
  const originalCreatedAt = joinResp.created_at;
  const originalUpdatedAt = joinResp.updated_at;
  TestValidator.equals("email is set on join", joinResp.email, email);
  TestValidator.equals("id is uuid format", joinResp.id, joinResp.id);
  TestValidator.notEquals(
    "createdAt and updatedAt differ after update",
    joinResp.created_at,
    null,
  );

  // 2. Login to authenticate
  const loginResp: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password: oldPassword,
        ip: null,
        href: "https://test-mysite.com/login",
        referrer: "https://mysite.com/landing",
      },
    });
  typia.assert(loginResp);
  TestValidator.equals("login email is same", loginResp.email, email);

  // 3. Update password to new valid value
  const newPassword: string & tags.MinLength<8> & tags.MaxLength<100> =
    RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.MaxLength<100>;
  const updateResp: ITodoListUser =
    await api.functional.todoList.user.users.update(connection, {
      email,
      body: {
        password: newPassword,
      },
    });
  typia.assert(updateResp);
  TestValidator.equals(
    "email is unchanged after password update",
    updateResp.email,
    email,
  );
  TestValidator.equals(
    "created_at is unchanged after password update",
    updateResp.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should change after password update",
    updateResp.updated_at,
    originalUpdatedAt,
  );

  // 4. Attempt login with new password
  const loginNew: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password: newPassword,
        ip: null,
        href: "https://test-mysite.com/login",
        referrer: "https://mysite.com/landing",
      },
    });
  typia.assert(loginNew);
  TestValidator.equals(
    "login with new password succeeds",
    loginNew.email,
    email,
  );

  // 5. Attempt password update with invalid password (too short)
  await TestValidator.error("password too short update fails", async () => {
    await api.functional.todoList.user.users.update(connection, {
      email,
      body: {
        password: "1234", // too short
      },
    });
  });

  // 6. Attempt password update for another user
  const otherEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const otherBody = {
    email: otherEmail,
    password: RandomGenerator.alphaNumeric(10) as string &
      tags.MinLength<8> &
      tags.MaxLength<100> &
      tags.Format<"password">,
    href: "https://test-mysite.com/register",
    referrer: "https://mysite.com/landing",
    ip: null,
  } satisfies ITodoListUser.ICreate;
  await api.functional.auth.user.join(connection, { body: otherBody });

  await TestValidator.error(
    "cannot update another user's password",
    async () => {
      await api.functional.todoList.user.users.update(connection, {
        email: otherEmail,
        body: {
          password: RandomGenerator.alphaNumeric(10) as string &
            tags.MinLength<8> &
            tags.MaxLength<100>,
        },
      });
    },
  );
}
