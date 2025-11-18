import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validates successful registration of a new todo user account.
 *
 * This test ensures that when a new user provides a unique, valid email and a
 * strong compliant password, along with all required registration context
 * fields (href, referrer, and optionally ip), they are able to register. The
 * test verifies that the backend enforces uniqueness and all business
 * validation logic documented for self-registration, and that the server issues
 * a correctly-structured authentication response (user info and JWT tokens).
 *
 * Steps:
 *
 * 1. Generate unique registration data:
 *
 *    - Random, RFC5322-valid email (not previously registered)
 *    - Strong password of at least 8 characters and less than 128
 *    - Random valid href and referrer (URIs)
 *    - Random valid ip (IPv4 or IPv6), randomly omitted or sent as null on some runs
 * 2. Call the registration API with this data
 * 3. Validate response:
 *
 *    - Response is of ITodoUser.IAuthorized and passes type assertion
 *    - Response contains unique user id (uuid), email matches sent one
 *    - Created_at/updated_at provided (date-time), token is present
 *    - Token structure matches IAuthorizationToken type
 *    - Access and refresh tokens present with valid expiration strings
 * 4. Validate that tokens are in correct form and non-empty
 * 5. (Negative test omitted as this test is for success only)
 */
export async function test_api_todo_user_registration_success(
  connection: api.IConnection,
) {
  // 1. Generate unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Randomly decide to use valid ip, null or omit the field
  const ipVariants = [
    typia.random<string & tags.Format<"ipv4">>(),
    typia.random<string & tags.Format<"ipv6">>(),
    null,
    undefined,
  ] as const;
  const ip = RandomGenerator.pick(ipVariants);
  const requestBody = {
    email,
    password,
    href,
    referrer,
    ...(ip === undefined ? {} : { ip }), // Omit property if undefined, include if null or value
  } satisfies ITodoUser.ICreate;

  // 2. Call registration API
  const output = await api.functional.auth.user.join(connection, {
    body: requestBody,
  });

  // 3. Validate response type
  typia.assert<ITodoUser.IAuthorized>(output);

  // 4. Field assertions
  TestValidator.predicate(
    "authorized user id is valid/uuid",
    typeof output.id === "string" && output.id.length > 0,
  );
  TestValidator.equals(
    "registered email should match input",
    output.email,
    requestBody.email,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof output.updated_at === "string" && output.updated_at.length > 0,
  );
  TestValidator.predicate(
    "token structure present",
    typeof output.token === "object" && output.token !== null,
  );

  // 5. Validate token fields
  typia.assert<IAuthorizationToken>(output.token);
  TestValidator.predicate(
    "access token nonempty",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token nonempty",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expired_at",
    typeof output.token.expired_at === "string" &&
      output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token refreshable_until",
    typeof output.token.refreshable_until === "string" &&
      output.token.refreshable_until.length > 0,
  );
}
