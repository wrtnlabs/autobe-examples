import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUserJoin";

/**
 * Validate repeat guestUser join behavior for the same browser.
 *
 * Business goal:
 *
 * - Simulate the same unauthenticated browser calling POST /auth/guestUser/join
 *   twice with the same temporaryIdentifier and context, and verify that both
 *   calls succeed and issue valid tokens.
 * - Observe whether the backend reuses the same guest identity or creates a new
 *   one, without asserting a single mandatory behavior, but still validating
 *   core invariants (temporary_identifier and user_agent consistency, per-call
 *   token issuance).
 *
 * Steps:
 *
 * 1. Construct a stable IRequest representing a concrete browser context.
 * 2. Perform first guest join and validate the returned IAuthorized payload.
 * 3. Perform second guest join with the same IRequest and validate again.
 * 4. Compare responses to ensure:
 *
 *    - Both are valid IShoppingMallGuestUser.IAuthorized values.
 *    - Temporary_identifier equals the request temporaryIdentifier in both.
 *    - User_agent matches the provided userAgent string in both.
 *    - Access tokens are different between the two joins (fresh issuance).
 *    - Guest id may be the same or different; the test only requires both ids to be
 *         valid and non-empty.
 */
export async function test_api_guest_user_join_idempotent_rejoin_with_same_temporary_identifier(
  connection: api.IConnection,
) {
  // 1. Prepare a stable browser-like context and request payload.
  const temporaryIdentifier = RandomGenerator.alphaNumeric(32);

  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Simplistic but realistic IPv4-like string; no strict IPv4 format tag here.
  const ip =
    `${Math.floor(Math.random() * 256)}.` +
    `${Math.floor(Math.random() * 256)}.` +
    `${Math.floor(Math.random() * 256)}.` +
    `${Math.floor(Math.random() * 256)}`;

  const userAgent = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 10,
  });

  const firstRequestBody = {
    temporaryIdentifier,
    guestCartToken: null,
    ip,
    userAgent,
    href,
    referrer,
  } satisfies IShoppingMallGuestUserJoin.IRequest;

  // 2. First guest join
  const firstJoin = await api.functional.auth.guestUser.join(connection, {
    body: firstRequestBody,
  });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(firstJoin);

  TestValidator.equals(
    "first join: response temporary_identifier must match request temporaryIdentifier",
    firstJoin.temporary_identifier,
    temporaryIdentifier,
  );
  TestValidator.equals(
    "first join: response user_agent must match provided userAgent",
    firstJoin.user_agent,
    userAgent,
  );

  // 3. Second guest join with the same browser context
  const secondRequestBody = {
    temporaryIdentifier,
    guestCartToken: null,
    ip,
    userAgent,
    href,
    referrer,
  } satisfies IShoppingMallGuestUserJoin.IRequest;

  const secondJoin = await api.functional.auth.guestUser.join(connection, {
    body: secondRequestBody,
  });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(secondJoin);

  TestValidator.equals(
    "second join: response temporary_identifier must match request temporaryIdentifier",
    secondJoin.temporary_identifier,
    temporaryIdentifier,
  );
  TestValidator.equals(
    "second join: response user_agent must match provided userAgent",
    secondJoin.user_agent,
    userAgent,
  );

  // 4. Compare responses to understand id and token behavior.
  TestValidator.predicate(
    "both joins must have non-empty guest ids",
    firstJoin.id.length > 0 && secondJoin.id.length > 0,
  );

  // Access tokens should be different between the two joins, as each join
  // should produce a fresh token even if the guest identity is reused.
  TestValidator.notEquals<IAuthorizationToken>(
    "access token must be re-issued on repeat guest join even with same temporaryIdentifier",
    firstJoin.token,
    secondJoin.token,
  );

  // Sanity check on timestamps: both created_at and updated_at must be
  // well-formed date-time strings (already ensured by typia.assert), but we
  // can assert they are non-empty and that updated_at is not earlier than
  // created_at for each join when parsed.
  const firstCreatedAt = new Date(firstJoin.created_at).getTime();
  const firstUpdatedAt = new Date(firstJoin.updated_at).getTime();
  const secondCreatedAt = new Date(secondJoin.created_at).getTime();
  const secondUpdatedAt = new Date(secondJoin.updated_at).getTime();

  TestValidator.predicate(
    "first join: updated_at should not be earlier than created_at",
    !Number.isNaN(firstCreatedAt) &&
      !Number.isNaN(firstUpdatedAt) &&
      firstUpdatedAt >= firstCreatedAt,
  );
  TestValidator.predicate(
    "second join: updated_at should not be earlier than created_at",
    !Number.isNaN(secondCreatedAt) &&
      !Number.isNaN(secondUpdatedAt) &&
      secondUpdatedAt >= secondCreatedAt,
  );
}
