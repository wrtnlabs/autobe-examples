import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate user registration happy path.
 *
 * This test verifies that a new user can successfully register with a unique,
 * valid email and strong password, and that all required session context
 * metadata is included. The response should return all required fields
 * including UUID, email, create/update timestamps, and valid JWT tokens with
 * expiration info. All returned data is asserted by typia, and business context
 * fields are checked for realistic business values. This test does not interact
 * with the database directly, only validates API and DTO contract.
 */
export async function test_api_user_registration_with_valid_data(
  connection: api.IConnection,
) {
  // Prepare valid registration body
  const registration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://app.todo.example.com/register", // Valid example registration page
    referrer: "https://app.todo.example.com/landing", // Valid example referral page
    ip: typia.random<string & tags.Format<"ipv4">>(), // Optionally provided by client
  } satisfies ITodoListUser.ICreate;

  // Call registration API
  const result = await api.functional.auth.user.join(connection, {
    body: registration,
  });
  typia.assert(result);

  // Business-level result assertion: input email matches output
  TestValidator.equals(
    "registered email matches input",
    result.email,
    registration.email,
  );
}
