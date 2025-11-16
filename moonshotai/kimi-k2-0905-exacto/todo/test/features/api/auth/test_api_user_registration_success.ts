import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Generate valid registration data with proper email format
  const email = typia.random<string & tags.Format<"email">>();

  // Generate secure password meeting requirements
  const password = RandomGenerator.alphaNumeric(12); // 12 characters with letters and numbers

  // Prepare registration request body
  const joinBody = {
    email,
    password,
    ip: "192.168.1.1",
    href: "https://example.com/register",
    referrer: "https://example.com/login",
  } satisfies ITodoAppUser.IJoin;

  // Call user registration API
  const registeredUser = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });

  // Validate response structure with typia PERFECT validation
  typia.assert(registeredUser);

  // Verify user data matches input
  TestValidator.equals("email matches input", registeredUser.email, email);

  // Verify authentication tokens are present and valid
  TestValidator.predicate(
    "access token exists",
    registeredUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    registeredUser.token.refresh.length > 0,
  );

  // Verify response contains complete user information
  TestValidator.predicate("user ID present", registeredUser.id.length > 0);
  TestValidator.predicate(
    "timestamps present",
    registeredUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated timestamps present",
    registeredUser.updated_at.length > 0,
  );

  // Test with different email to ensure uniqueness
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(10);

  const joinBody2 = {
    email: email2,
    password: password2,
    ip: "192.168.1.2",
    href: "https://example.com/register",
    referrer: "https://example.com/flogin",
  } satisfies ITodoAppUser.IJoin;

  const registeredUser2 = await api.functional.auth.user.join(connection, {
    body: joinBody2,
  });

  typia.assert(registeredUser2);

  // Verify second registration is successful with different email
  TestValidator.equals("second email matches", registeredUser2.email, email2);
  TestValidator.notEquals(
    "user IDs are unique",
    registeredUser.id,
    registeredUser2.id,
  );

  // Verify authentication tokens are separate for each user
  TestValidator.notEquals(
    "access tokens are unique",
    registeredUser.token.access,
    registeredUser2.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens are unique",
    registeredUser.token.refresh,
    registeredUser2.token.refresh,
  );
}
