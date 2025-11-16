import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

/**
 * Validate URI format enforcement for guestUser join navigation fields.
 *
 * Business goal:
 *
 * - Ensure that /auth/guestUser/join strictly enforces the `format: "uri"`
 *   constraint on `href` and `referrer` in ITodoAppGuestUserJoin.IRequest.
 * - Confirm that when these fields are clearly invalid, the join operation fails
 *   with a client-side validation error instead of returning an
 *   ITodoAppGuestUser.IAuthorized payload and updating connection headers.
 * - Confirm that a payload with valid URI formats is accepted and results in a
 *   successful guest authorization response.
 *
 * Scenario:
 *
 * 1. Attempt to call api.functional.auth.guestUser.join with intentionally
 *    malformed `href` and `referrer` values (e.g., simple non-URI strings such
 *    as "not-a-uri"), while keeping optional fields either omitted or valid.
 * 2. Use TestValidator.error to assert that the call fails (validation error),
 *    expressing that invalid navigation URIs must not be accepted.
 * 3. Then call the same endpoint with well-formed URI strings for `href` and
 *    `referrer` to demonstrate that a similar payload with valid URIs succeeds,
 *    returning ITodoAppGuestUser.IAuthorized.
 * 4. Assert the successful response type with typia.assert and ensure the token
 *    and session structures look valid from a type perspective.
 */
export async function test_api_guestuser_join_invalid_navigation_uris_rejected(
  connection: api.IConnection,
) {
  // 1. Try join with obviously invalid href/referrer values.
  const invalidRequest = {
    // optional context left undefined to focus on URI validation
    href: "not-a-uri",
    referrer: "also-not-a-uri",
  } satisfies ITodoAppGuestUserJoin.IRequest;

  await TestValidator.error(
    "guestUser.join must reject invalid navigation URIs",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: invalidRequest,
      });
    },
  );

  // 2. Call join with valid URIs to ensure success path still works.
  const validRequest = {
    external_reference: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    ip: "203.0.113.10",
    href: "https://todo.example.com/app?source=e2e-uri-valid",
    referrer: "https://landing.example.com/campaign/spring",
  } satisfies ITodoAppGuestUserJoin.IRequest;

  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: validRequest,
    });

  // 3. Validate response structure and basic logical expectations.
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);
  typia.assert<ITodoAppGuestUser.ISummary>(authorized.guest);
  typia.assert<ITodoAppGuestUserSession.ISummary>(authorized.session);

  TestValidator.predicate(
    "guest id must be a non-empty UUID string",
    () => authorized.guest.id.length > 0,
  );

  TestValidator.predicate(
    "session href should be set on successful join",
    () => authorized.session.href.length > 0,
  );

  TestValidator.predicate(
    "session referrer should be set on successful join",
    () => authorized.session.referrer.length > 0,
  );
}
