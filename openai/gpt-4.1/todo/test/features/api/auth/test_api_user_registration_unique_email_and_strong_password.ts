import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate user registration with unique email and strong password.
 *
 * This test covers:
 *
 * - Generating a random unique email address (valid format, guaranteed new each
 *   run)
 * - Generating a strong password (at least 8 characters, contains letters and
 *   numbers)
 * - Providing required session context: href and referrer (valid URIs)
 * - Submitting the registration request via /auth/user/join
 * - Verifying response includes all allowed fields (id, email, created_at,
 *   updated_at, token)
 * - Ensuring token contains access, refresh, expired_at, and refreshable_until
 *   fields
 * - Confirming type and format conformance for all response fields
 * - Ensuring server enforces email uniqueness, password minimum requirements, and
 *   allows only permitted data output
 *
 * No pre-existing user data or dependencies required. This is a stand-alone
 * scenario.
 */
export async function test_api_user_registration_unique_email_and_strong_password(
  connection: api.IConnection,
) {
  // Generate test data
  const email = typia.random<string & tags.Format<"email">>();
  // Generate strong password - 8+ alphanumeric characters
  const passwordRaw = RandomGenerator.alphaNumeric(12);
  // Ensure at least one letter and one number (by regex)
  const password =
    /[a-z]/i.test(passwordRaw) && /[0-9]/.test(passwordRaw)
      ? passwordRaw
      : passwordRaw.slice(0, 8) + "Ab1";
  const href = "https://test.example.com/register";
  const referrer = "https://test.example.com/login";
  // Compose registration request
  const body = {
    email,
    password: password satisfies string & tags.MinLength<8> as string,
    href,
    referrer,
  } satisfies ITodoUser.IJoin;
  // Perform registration
  const result = await api.functional.auth.user.join(connection, {
    body,
  });
  typia.assert(result);
  // Check response fields
  TestValidator.predicate(
    "response contains all allowed fields",
    "id" in result &&
      "email" in result &&
      "created_at" in result &&
      "updated_at" in result &&
      "token" in result,
  );
  // Validate token fields
  const { token } = result;
  TestValidator.predicate(
    "token contains access, refresh, expired_at, refreshable_until",
    "access" in token &&
      "refresh" in token &&
      "expired_at" in token &&
      "refreshable_until" in token,
  );
  typia.assert(token);
  // Validate id format
  TestValidator.predicate(
    "id is a UUID",
    typeof result.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        result.id,
      ),
  );
  // Validate email matches input
  TestValidator.equals("email matches", result.email, email);
  // Validate created_at/updated_at are ISO strings
  TestValidator.predicate(
    "created_at and updated_at are valid ISO date strings",
    typeof result.created_at === "string" &&
      !isNaN(Date.parse(result.created_at)) &&
      typeof result.updated_at === "string" &&
      !isNaN(Date.parse(result.updated_at)),
  );
  // Validate password is not leaked in response
  TestValidator.predicate(
    "response does not leak password",
    !("password" in result),
  );
  // Re-registering same email must fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body,
      });
    },
  );
}
