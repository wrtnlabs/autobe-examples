import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user registration for the Todo List application.
 *
 * This test simulates an individual registering by posting a unique, valid
 * email, a secure password (8-72 chars), and required session context (href,
 * referrer), optionally with a random IP address (IPv4 or IPv6). It confirms
 * that:
 *
 * - The registration succeeds with correct request shape.
 * - The response contains the user's email, a valid ISO8601 created_at, a unique
 *   id (UUID), and an IAuthorizationToken with all expected token properties
 *   populated and valid.
 * - No failure or edge case (such as duplicate or weak password) is tested
 *   here—only the success path is validated.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // Generate registration inputs: unique email, valid password, URI-form href & referrer, and random IP (optional)
  const input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // secure and policy-compliant
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: RandomGenerator.pick([
      typia.random<string & tags.Format<"ipv4">>(),
      typia.random<string & tags.Format<"ipv6">>(),
      undefined,
      null,
    ]),
  } satisfies ITodoListUser.IJoin;

  // Call registration endpoint
  const result = await api.functional.auth.user.join(connection, {
    body: input,
  });
  typia.assert(result);

  // Validate response fields
  TestValidator.equals(
    "registered email matches input",
    result.email,
    input.email,
  );
  TestValidator.predicate(
    "created_at is ISO8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.created_at),
  );
  TestValidator.predicate(
    "user id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );

  // Validate token structure and content
  typia.assert(result.token);
  TestValidator.predicate(
    "access token is nonempty string",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is nonempty string",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.token.refreshable_until),
  );
}
