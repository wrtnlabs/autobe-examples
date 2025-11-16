import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Validate repeated guestUser join behavior and authorized payload structure.
 *
 * Business context:
 *
 * - The `/auth/guestUser/join` endpoint creates a surrogate guestUser record and
 *   issues a JWT-based authorization envelope
 *   (`ICommunityPlatformGuestuser.IAuthorized`).
 * - The underlying persistence layer uses a `community_platform_guestusers` table
 *   with soft-deletion semantics (`deleted_at` marks logical deletion), and
 *   join must never resurrect or reuse logically deleted surrogates.
 *
 * Practical constraints in this test:
 *
 * - The public SDK only exposes the `join` endpoint and the authorized response
 *   type; there are no admin/delete/inspection APIs or `deleted_at` fields
 *   visible at the DTO level.
 * - Therefore, we cannot directly simulate or verify soft-deletion state.
 *
 * What this test validates instead:
 *
 * 1. A first call to `api.functional.auth.guestUser.join(connection)` returns a
 *    structurally valid `ICommunityPlatformGuestuser.IAuthorized` payload.
 * 2. A second call to the same join endpoint, using the same connection (which the
 *    SDK has already decorated with an Authorization header), also returns a
 *    structurally valid authorized payload.
 * 3. Both responses contain non-empty UUID `id` values and non-empty
 *    `IAuthorizationToken` fields (`access`, `refresh`, `expired_at`,
 *    `refreshable_until`). Type correctness and format constraints are fully
 *    enforced by `typia.assert`.
 *
 * This test focuses on repeat join behavior and the integrity of the
 * authorization envelope, laying groundwork for higher-level suites that might
 * coordinate with out-of-band fixtures to assert non-reuse of soft-deleted
 * surrogates.
 */
export async function test_api_guest_user_join_deleted_surrogate_not_reused(
  connection: api.IConnection,
) {
  // 1. First guestUser join call
  const first: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(first);

  const firstId: string & tags.Format<"uuid"> = first.id;
  const firstToken: IAuthorizationToken = first.token;
  typia.assert<IAuthorizationToken>(firstToken);

  TestValidator.predicate(
    "first guestUser id must be a non-empty UUID string",
    () => firstId.length > 0,
  );

  TestValidator.predicate(
    "first guestUser access token must be non-empty",
    () => firstToken.access.length > 0,
  );

  TestValidator.predicate(
    "first guestUser refresh token must be non-empty",
    () => firstToken.refresh.length > 0,
  );

  // 2. Second guestUser join call on the same connection
  const second: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(second);

  const secondId: string & tags.Format<"uuid"> = second.id;
  const secondToken: IAuthorizationToken = second.token;
  typia.assert<IAuthorizationToken>(secondToken);

  TestValidator.predicate(
    "second guestUser id must be a non-empty UUID string",
    () => secondId.length > 0,
  );

  TestValidator.predicate(
    "second guestUser access token must be non-empty",
    () => secondToken.access.length > 0,
  );

  TestValidator.predicate(
    "second guestUser refresh token must be non-empty",
    () => secondToken.refresh.length > 0,
  );

  // 3. Document and sanity-check relationship between first and second IDs.
  //
  // The platform may choose either of the following semantics:
  // - Idempotent join (same surrogate id reused while active).
  // - Always-new surrogate on join (different id each time).
  //
  // Since the requirements and API surface do not expose a way to
  // differentiate these behaviors reliably in tests, we only assert that both
  // IDs are valid UUID strings and leave equality/inequality decisions to
  // higher-level specifications or additional fixtures.
  TestValidator.predicate(
    "first and second guestUser ids must both be valid UUIDs (typia.assert already enforces format)",
    () => firstId.length > 0 && secondId.length > 0,
  );
}
