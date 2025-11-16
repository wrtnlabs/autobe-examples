import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Verify guest join reuses existing guest record for same anonymous_handle.
 *
 * ## Business purpose
 *
 * This test ensures that the guest join endpoint implements idempotent identity
 * correlation semantics for anonymous guests:
 *
 * - When a client provides an `anonymous_handle`, the backend should either
 *   create a new guest record or reuse an existing _non-deleted_ guest record
 *   with that handle.
 * - Reuse means the logical guest identity (guest `id` and `anonymous_handle`)
 *   remains stable across multiple join operations.
 * - Each join, however, must issue a fresh authorization token to represent a new
 *   session, so `token.access` should change between calls.
 * - Lifecycle timestamps must reflect consistent semantics: `created_at` is the
 *   original creation moment; `updated_at` must be greater than or equal to
 *   `created_at` and can advance on subsequent joins.
 *
 * ## Scenario steps
 *
 * 1. Construct a deterministic `anonymous_handle` string to be reused between two
 *    join requests.
 * 2. Perform the first POST /auth/guestUser/join with a well-formed
 *    ICommunityPlatformGuestuser.IJoin body, including:
 *
 *    - `anonymous_handle`: the chosen opaque handle.
 *    - `href`: a random but valid URL string.
 *    - `referrer`: another random but valid URL string.
 *    - `user_agent`: a realistic user agent string (can be a random paragraph or a
 *         simple fixed UA token string).
 *    - `ip`: a valid IPv4 address.
 * 3. Assert that the response matches ICommunityPlatformGuestuser.IAuthorized
 *    using typia.assert, then capture key fields:
 *
 *    - `first.id`
 *    - `first.anonymous_handle`
 *    - `first.token.access`
 *    - `first.created_at`, `first.updated_at`, `first.deleted_at`.
 * 4. Perform a second POST /auth/guestUser/join using the same `anonymous_handle`,
 *    but vary the contextual fields (href, referrer, user_agent, ip) to
 *    simulate a new visit from the same logical guest.
 * 5. Assert that the second response matches
 *    ICommunityPlatformGuestuser.IAuthorized using typia.assert, then capture
 *    analogous fields.
 *
 * ## Assertions
 *
 * - Identity reuse
 *
 *   - Guest ID must be stable:
 *
 *       - `second.id` equals `first.id`.
 *   - Anonymous handle must be preserved (if present):
 *
 *       - `second.anonymous_handle` equals `first.anonymous_handle`.
 * - Token issuance behavior
 *
 *   - A new access token should be issued on the second join:
 *
 *       - `second.token.access` is not equal to `first.token.access`.
 *   - Refresh token and expiration timestamps may also change; we only require that
 *       at least the access token changes.
 * - Lifecycle timestamps
 *
 *   - `created_at` is stable across joins:
 *
 *       - `second.created_at` equals `first.created_at`.
 *   - `updated_at` must be greater than or equal to `created_at` within each
 *       response and must not regress between calls:
 *
 *       - Within each response: `created_at <= updated_at`.
 *       - Across responses: `first.updated_at <= second.updated_at`.
 *   - `deleted_at` remains null (non-deleted guest reused):
 *
 *       - `first.deleted_at === null`.
 *       - `second.deleted_at === null`.
 *
 * ## Implementation details
 *
 * - Use `typia.random<string & tags.Format<"uri">>()` for href and referrer.
 * - Use `typia.random<string & tags.Format<"ipv4">>()` for ip.
 * - Use a fixed user_agent like "test-agent/1.0" or a RandomGenerator paragraph.
 * - The `anonymous_handle` can be a simple random alphaNumeric string.
 * - Use TestValidator.equals / notEquals / predicate with descriptive titles for
 *   all assertions.
 */
export async function test_api_guest_user_join_reuses_existing_handle(
  connection: api.IConnection,
) {
  // 1. Prepare a reusable anonymous handle and initial join payload
  const anonymousHandle: string = RandomGenerator.alphaNumeric(16);

  const firstJoinBody = {
    anonymous_handle: anonymousHandle,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformGuestuser.IJoin;

  // 2. First join call
  const first: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: firstJoinBody,
    });
  typia.assert(first);

  // Basic invariants on first response
  TestValidator.predicate(
    "first.id should be non-empty UUID string",
    () => typeof first.id === "string" && first.id.length > 0,
  );

  TestValidator.equals(
    "first.anonymous_handle should equal requested anonymous_handle",
    first.anonymous_handle ?? null,
    anonymousHandle,
  );

  TestValidator.predicate(
    "first.token.access should be non-empty string",
    () => first.token.access.length > 0,
  );

  TestValidator.predicate(
    "first.created_at should be <= first.updated_at",
    () =>
      new Date(first.created_at).getTime() <=
      new Date(first.updated_at).getTime(),
  );

  TestValidator.equals(
    "first.deleted_at should be null for active guest",
    first.deleted_at ?? null,
    null,
  );

  const firstId: string & tags.Format<"uuid"> = first.id;
  const firstTokenAccess: string = first.token.access;
  const firstCreatedAt: string & tags.Format<"date-time"> = first.created_at;
  const firstUpdatedAt: string & tags.Format<"date-time"> = first.updated_at;

  // 3. Second join call with same anonymous_handle but different context
  const secondJoinBody = {
    anonymous_handle: anonymousHandle,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    user_agent: RandomGenerator.paragraph({ sentences: 4 }),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformGuestuser.IJoin;

  const second: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: secondJoinBody,
    });
  typia.assert(second);

  // 4. Identity reuse assertions
  TestValidator.equals(
    "guest id should be reused when same anonymous_handle is provided",
    second.id,
    firstId,
  );

  TestValidator.equals(
    "anonymous_handle should be preserved across joins",
    second.anonymous_handle ?? null,
    anonymousHandle,
  );

  // 5. Token issuance behavior
  TestValidator.notEquals(
    "second token.access should differ from first token.access",
    second.token.access,
    firstTokenAccess,
  );

  // 6. Lifecycle timestamp semantics
  TestValidator.equals(
    "created_at should remain stable across joins",
    second.created_at,
    firstCreatedAt,
  );

  TestValidator.predicate(
    "second.created_at should be <= second.updated_at",
    () =>
      new Date(second.created_at).getTime() <=
      new Date(second.updated_at).getTime(),
  );

  TestValidator.predicate(
    "updated_at should not regress and should be >= first.updated_at",
    () =>
      new Date(firstUpdatedAt).getTime() <=
      new Date(second.updated_at).getTime(),
  );

  TestValidator.equals(
    "second.deleted_at should remain null for reused guest",
    second.deleted_at ?? null,
    null,
  );
}
