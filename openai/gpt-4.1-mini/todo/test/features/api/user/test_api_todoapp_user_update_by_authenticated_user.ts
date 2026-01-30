import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * E2E test to validate user profile update capability by authenticated users.
 *
 * This test covers the user registration, login authentication, and the profile
 * update endpoint ensuring proper authorization and data persistence. It
 * ensures a user can update their own profile but cannot update other users'.
 *
 * Steps:
 *
 * 1. Register a new user with valid data
 * 2. Login as the user to authenticate
 * 3. Update the user's profile with new email, username, and password
 * 4. Assert the response confirms updated data
 * 5. Register a second user
 * 6. Attempt to update the first user's profile using the second user's connection
 * 7. Confirm authorization error (or failure) for cross-user update
 */
export async function test_api_todoapp_user_update_by_authenticated_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User registration
  const joinInput = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ITodoAppUser.IJoin;
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUserAuthorized = await authorize_member_join(firstUserConnection, {
    body: joinInput,
  });
  typia.assert(firstUserAuthorized);
  // Step 2: Login as first user to get authenticated connection
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies ITodoAppUser.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const loginAuthorized = await authorize_member_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(loginAuthorized);
  // Transfer authorization token to connection headers
  loginConnection.headers = {
    ...(loginConnection.headers ?? {}),
    Authorization: loginAuthorized.token.access,
  };
  // Step 3: Prepare update data
  const updateInput = {
    email: `${RandomGenerator.alphaNumeric(8)}@updated.com`,
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(20),
  } satisfies ITodoAppUser.IUpdate;
  // Step 4: Update own profile
  const updatedUser = await api.functional.todoApp.user.users.update(
    loginConnection,
    {
      userId: firstUserAuthorized.id,
      body: updateInput,
    },
  );
  typia.assert(updatedUser);
  // Validate updated fields match input
  TestValidator.equals(
    "email updated correctly",
    updatedUser.email,
    updateInput.email!,
  );
  TestValidator.equals(
    "username updated correctly",
    updatedUser.username,
    updateInput.username!,
  );
  // Step 5: Register a second user to test unauthorized update attempt
  const secondJoinInput = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ITodoAppUser.IJoin;
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUserAuthorized = await authorize_member_join(
    secondUserConnection,
    { body: secondJoinInput },
  );
  typia.assert(secondUserAuthorized);
  // Step 6: Login as second user
  const secondLoginInput = {
    email: secondJoinInput.email,
    password: secondJoinInput.password,
  } satisfies ITodoAppUser.ILogin;
  const secondLoginConnection: api.IConnection = { host: connection.host };
  const secondLoginAuthorized = await authorize_member_login(
    secondLoginConnection,
    { body: secondLoginInput },
  );
  typia.assert(secondLoginAuthorized);
  secondLoginConnection.headers = {
    ...(secondLoginConnection.headers ?? {}),
    Authorization: secondLoginAuthorized.token.access,
  };
  // Step 7: Attempt to update first user's profile with second user's connection
  await TestValidator.error(
    "unauthorized user cannot update another user's profile",
    async () => {
      await api.functional.todoApp.user.users.update(secondLoginConnection, {
        userId: firstUserAuthorized.id,
        body: updateInput,
      });
    },
  );
}
