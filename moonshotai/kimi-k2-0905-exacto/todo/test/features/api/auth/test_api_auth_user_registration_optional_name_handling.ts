import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test optional name field functionality in user registration
 *
 * This test validates the proper handling of the optional name field in user
 * registration. It tests three scenarios:
 *
 * 1. Registration with a name provided
 * 2. Registration without a name (name field omitted)
 * 3. Registration with null name value
 *
 * Each scenario should successfully create a user account with appropriate name
 * handling. The test verifies that the API properly processes all three cases
 * and returns correct user data in the response.
 */
export async function test_api_auth_user_registration_optional_name_handling(
  connection: api.IConnection,
) {
  // Test 1: Registration with name provided
  const emailWithName = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const fullName = RandomGenerator.name();

  const userWithName = await api.functional.auth.user.join(connection, {
    body: {
      email: emailWithName,
      password: password,
      name: fullName,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(userWithName);

  TestValidator.equals(
    "user with name has correct email",
    userWithName.email,
    emailWithName,
  );
  TestValidator.equals(
    "user with name has provided name",
    userWithName.name,
    fullName,
  );
  TestValidator.predicate(
    "user with name has token",
    userWithName.token !== null,
  );
  TestValidator.equals(
    "user with name has active status",
    userWithName.status,
    "active",
  );

  // Test 2: Registration without name (name field omitted)
  const emailWithoutName = typia.random<string & tags.Format<"email">>();
  const passwordNoName = RandomGenerator.alphaNumeric(12);

  const userWithoutName = await api.functional.auth.user.join(connection, {
    body: {
      email: emailWithoutName,
      password: passwordNoName,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(userWithoutName);

  TestValidator.equals(
    "user without name has correct email",
    userWithoutName.email,
    emailWithoutName,
  );
  TestValidator.predicate(
    "user without name has null name",
    userWithoutName.name === null || userWithoutName.name === undefined,
  );
  TestValidator.predicate(
    "user without name has token",
    userWithoutName.token !== null,
  );
  TestValidator.equals(
    "user without name has active status",
    userWithoutName.status,
    "active",
  );

  // Test 3: Registration with explicit null name
  const emailNullName = typia.random<string & tags.Format<"email">>();
  const passwordNullName = RandomGenerator.alphaNumeric(12);

  const userWithNullName = await api.functional.auth.user.join(connection, {
    body: {
      email: emailNullName,
      password: passwordNullName,
      name: null,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(userWithNullName);

  TestValidator.equals(
    "user with null name has correct email",
    userWithNullName.email,
    emailNullName,
  );
  TestValidator.predicate(
    "user with null name has null name",
    userWithNullName.name === null,
  );
  TestValidator.predicate(
    "user with null name has token",
    userWithNullName.token !== null,
  );
  TestValidator.equals(
    "user with null name has active status",
    userWithNullName.status,
    "active",
  );
}
