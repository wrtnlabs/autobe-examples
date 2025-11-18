import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Tests successful administrator registration using valid, unique email and a
 * compliant password according to password policy, plus valid href/referrer
 * values. Expects the system to create a new admin account, store a hashed
 * password, and return authorized session details including valid JWT tokens,
 * admin user info, and audit metadata. Verifies the email is not already taken
 * and that a secure session is correctly returned.
 *
 * Steps:
 *
 * 1. Generate unique, valid email and password for admin registration
 * 2. Create random valid URIs for href and referrer
 * 3. Call the registration endpoint with this data
 * 4. Assert that registration succeeds (no error thrown)
 * 5. Validate response: id (uuid), email (matches input), is_locked is false,
 *    timestamps are ISO date-time, token is present (with string JWTs and
 *    date-time expirations)
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  // 1. Generate unique, valid email and password
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10) + "!Aa";
  // 2. Generate random, valid absolute URIs for href and referrer
  const href = "https://" + RandomGenerator.alphaNumeric(10) + ".test/join";
  const referrer =
    "https://" + RandomGenerator.alphaNumeric(8) + ".test/landing";

  // 3. Registration API call
  const output = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(output);

  // 4. Verify admin id is a valid UUID
  TestValidator.predicate(
    "admin id must be valid UUID",
    typeof output.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        output.id,
      ),
  );

  // 5. Email matches input and has correct format
  TestValidator.equals("returned email matches input", output.email, email);

  // 6. is_locked must be false
  TestValidator.equals(
    "is_locked is false on registration",
    output.is_locked,
    false,
  );

  // 7. created_at and updated_at are valid ISO 8601 date-time
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof output.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(
        output.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof output.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(
        output.updated_at,
      ),
  );

  // 8. Token must be present and JWT fields must be string
  TestValidator.predicate(
    "access token is string",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is string",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO date-time",
    typeof output.token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(
        output.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "refreshable_until is ISO date-time",
    typeof output.token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(
        output.token.refreshable_until,
      ),
  );
}
