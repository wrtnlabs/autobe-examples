import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Validate that each guestUser join call provisions a fresh surrogate identity.
 *
 * Business goal:
 *
 * - Ensure POST /auth/guestUser/join never reuses an existing
 *   community_platform_guestusers row when invoked multiple times from the same
 *   logical client context.
 * - Each invocation must return a distinct guestUser.id and corresponding
 *   authorization token envelope.
 *
 * Scenario:
 *
 * 1. Call api.functional.auth.guestUser.join(connection) three times in sequence
 *    using the same connection instance.
 * 2. For each response, validate the structure as
 *    ICommunityPlatformGuestuser.IAuthorized using typia.assert.
 * 3. Assert that all three returned id values are distinct UUIDs using
 *    TestValidator.notEquals pairwise.
 * 4. Rely on typia.assert to guarantee that token.access, token.refresh and their
 *    timestamps are well-formed; no explicit format checks are necessary.
 * 5. Do not touch connection.headers directly; let the SDK manage Authorization
 *    header updates between calls.
 */
export async function test_api_guest_user_join_is_idempotent_per_call_not_reusing_surrogate(
  connection: api.IConnection,
) {
  // First join invocation
  const first: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(first);

  // Second join invocation using the same connection instance
  const second: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(second);

  // Third join invocation for stronger uniqueness guarantee
  const third: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection);
  typia.assert<ICommunityPlatformGuestuser.IAuthorized>(third);

  // Validate that each returned id is a distinct UUID
  TestValidator.notEquals(
    "second guestUser id must differ from first",
    first.id,
    second.id,
  );
  TestValidator.notEquals(
    "third guestUser id must differ from first",
    first.id,
    third.id,
  );
  TestValidator.notEquals(
    "third guestUser id must differ from second",
    second.id,
    third.id,
  );
}
