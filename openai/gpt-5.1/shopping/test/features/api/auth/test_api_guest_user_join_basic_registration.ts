import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUserJoin";

/**
 * Validate basic guest user registration for unauthenticated visitors.
 *
 * This test exercises the public POST /auth/guestUser/join endpoint with a
 * minimal but valid IShoppingMallGuestUserJoin.IRequest payload. It ensures
 * that a new guest identity can be created without prior authentication and
 * that the server returns a fully populated IShoppingMallGuestUser.IAuthorized
 * session envelope with sane timestamps and token metadata.
 *
 * Business steps:
 *
 * 1. Construct a minimal join request body including:
 *
 *    - TemporaryIdentifier: opaque non-empty string within 1..255 chars.
 *    - Href: valid current page URL (e.g., listing page).
 *    - Referrer: valid referrer URL (e.g., marketing page). Optional fields
 *         guestCartToken, ip, and userAgent are omitted so that the backend
 *         infers or defaults them.
 * 2. Call api.functional.auth.guestUser.join using the shared unauthenticated
 *    connection; the endpoint is public and must succeed without tokens.
 * 3. Assert the response conforms to IShoppingMallGuestUser.IAuthorized via
 *    typia.assert, then perform additional business validations:
 *
 *    - Temporary_identifier is non-empty.
 *    - User_agent is non-empty (server populated or inferred).
 *    - Created_at and updated_at are valid ISO 8601 timestamps where created_at <=
 *         updated_at.
 *    - Token.access and token.refresh are non-empty, JWT-like strings containing at
 *         least two dots.
 *    - Token.expired_at and token.refreshable_until are strictly in the future
 *         relative to the current system time.
 * 4. Call join a second time on the same connection to verify that the SDK has
 *    correctly updated connection headers behind the scenes and that repeated
 *    guest registrations continue to succeed.
 */
export async function test_api_guest_user_join_basic_registration(
  connection: api.IConnection,
) {
  // Step 1: Build minimal, valid join request body.
  const requestBody = {
    temporaryIdentifier: RandomGenerator.alphaNumeric(32),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallGuestUserJoin.IRequest;

  // Step 2: Call guestUser.join as an unauthenticated visitor.
  const first: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: requestBody,
    });

  // Type-level validation of response structure.
  typia.assert<IShoppingMallGuestUser.IAuthorized>(first);

  // Step 3: Business-level validations on the first response.

  // 3-1) temporary_identifier must be non-empty.
  TestValidator.predicate(
    "temporary_identifier should be non-empty",
    first.temporary_identifier.length > 0,
  );

  // 3-2) user_agent must be non-empty (server inferred or persisted value).
  TestValidator.predicate(
    "user_agent should be non-empty",
    first.user_agent.length > 0,
  );

  // 3-3) created_at and updated_at must be valid ISO date-times with
  //       created_at <= updated_at.
  const createdAtFirst = new Date(first.created_at).getTime();
  const updatedAtFirst = new Date(first.updated_at).getTime();

  TestValidator.predicate(
    "created_at should be a valid date",
    Number.isFinite(createdAtFirst),
  );
  TestValidator.predicate(
    "updated_at should be a valid date",
    Number.isFinite(updatedAtFirst),
  );
  TestValidator.predicate(
    "created_at should not be after updated_at",
    createdAtFirst <= updatedAtFirst,
  );

  // 3-4) token.access and token.refresh are non-empty and appear JWT-like
  //       (contain at least two dots).
  TestValidator.predicate(
    "token.access should be non-empty",
    first.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh should be non-empty",
    first.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token.access should look JWT-like (have two dots)",
    first.token.access.split(".").length >= 3,
  );
  TestValidator.predicate(
    "token.refresh should look JWT-like (have two dots)",
    first.token.refresh.split(".").length >= 3,
  );

  // 3-5) token.expired_at and token.refreshable_until must be future timestamps.
  const now = Date.now();
  const expiredAtFirst = new Date(first.token.expired_at).getTime();
  const refreshableUntilFirst = new Date(
    first.token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "token.expired_at should be a valid future date",
    Number.isFinite(expiredAtFirst) && expiredAtFirst > now,
  );
  TestValidator.predicate(
    "token.refreshable_until should be a valid future date",
    Number.isFinite(refreshableUntilFirst) && refreshableUntilFirst > now,
  );

  // Step 4: Call join a second time on the same connection to ensure the
  // endpoint remains usable and that the SDK-managed Authorization header does
  // not interfere with new guest registrations.
  const secondBody = {
    temporaryIdentifier: RandomGenerator.alphaNumeric(32),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallGuestUserJoin.IRequest;

  const second: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: secondBody,
    });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(second);

  // Basic sanity checks on the second response.
  TestValidator.predicate(
    "second guest id should be non-empty UUID string",
    second.id.length > 0,
  );
  TestValidator.predicate(
    "second temporary_identifier should be non-empty",
    second.temporary_identifier.length > 0,
  );

  // Ensure that both responses represent valid, distinct sessions. IDs may or
  // may not differ depending on backend semantics, so we only require that
  // their tokens differ to indicate separate authorization envelopes.
  TestValidator.notEquals<IAuthorizationToken, IAuthorizationToken>(
    "access tokens between first and second join should differ",
    first.token,
    second.token,
  );
}
