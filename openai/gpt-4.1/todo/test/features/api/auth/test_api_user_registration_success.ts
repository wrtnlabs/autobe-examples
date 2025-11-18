import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates a successful user registration (join) via the /auth/user/join API
 * endpoint.
 *
 * This test covers the happy path where a new user provides a unique, valid
 * email address, strong password, and required session context (href, referrer
 * URI, and ip [either v4/v6/null]). Test data is generated for maximum coverage
 * of type and format constraints.
 *
 * Steps:
 *
 * 1. Create a random user registration DTO (ITodoListUser.ICreate) with:
 *
 *    - Email: Globally unique (never used in previous registrations) and valid email
 *         format.
 *    - Password: Satisfies all length and format constraints, strong and random.
 *    - Href, referrer: Valid random URIs.
 *    - Ip: Randomly choose between IPv4, IPv6, or null (verify server handles all
 *         supported types).
 * 2. Call api.functional.auth.user.join(connection, { body })
 * 3. Assert that the response is ITodoListUser.IAuthorized, i.e., only public user
 *    info (id, email, created_at, updated_at) and a valid token object
 *    (ITodoListSysMigration) with correct field types and formats.
 * 4. Ensure no sensitive data (such as password or hash) is ever included in the
 *    response.
 * 5. Optionally, cross-validate that the user email in the response matches the
 *    one sent in request, timestamps have correct format, token fields are
 *    strings in expected JWT/date/time formats.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Generate valid user registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<100> & tags.Format<"password">
  >();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Randomly pick ipv4, ipv6, or null for ip
  const ipOptions = [
    typia.random<string & tags.Format<"ipv4">>(),
    typia.random<string & tags.Format<"ipv6">>(),
    null,
  ] as const;
  const ip = RandomGenerator.pick(ipOptions);

  const requestBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies ITodoListUser.ICreate;

  // Register user
  const result = await api.functional.auth.user.join(connection, {
    body: requestBody,
  });
  typia.assert(result);

  // Ensure response contains correct email, all required fields, and ONLY safe public attributes
  TestValidator.equals("response email matches input", result.email, email);
  TestValidator.predicate(
    "id is uuid format",
    typeof result.id === "string" && result.id.length === 36 /* UUID format */,
  );
  TestValidator.predicate(
    "created_at is ISO8601",
    typeof result.created_at === "string" && result.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO8601",
    typeof result.updated_at === "string" && result.updated_at.includes("T"),
  );
  TestValidator.predicate(
    "token is present and correctly structured",
    typeof result.token.access === "string" &&
      typeof result.token.refresh === "string" &&
      typeof result.token.expired_at === "string" &&
      typeof result.token.refreshable_until === "string",
  );
}
