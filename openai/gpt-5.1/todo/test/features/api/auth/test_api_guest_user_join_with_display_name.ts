import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

/**
 * Verify that guestUser join accepts and echoes an optional display_name.
 *
 * Business goal: When a client calls POST /auth/guestUser/join with an
 * ITodoAppGuestUser.IJoin payload containing display_name, the backend should
 * persist that nickname on the guest identity and include it in the returned
 * ITodoAppGuestUser.IAuthorized payload.
 *
 * This test focuses on the "happy path" for that behavior and demonstrates that
 * multiple joins with different display names each get their own echoed
 * nickname.
 *
 * Steps:
 *
 * 1. Build a first ITodoAppGuestUser.IJoin request body with a fixed display_name
 *    such as "Guest Ninja".
 * 2. Call api.functional.auth.guestUser.join with that body and await the
 *    ITodoAppGuestUser.IAuthorized response.
 * 3. Typia.assert() the response to ensure it structurally matches
 *    ITodoAppGuestUser.IAuthorized.
 * 4. Use TestValidator.equals() to assert that authorized.display_name equals the
 *    requested display_name string.
 * 5. Build a second ITodoAppGuestUser.IJoin body with a different display_name
 *    value (e.g., "Guest Samurai").
 * 6. Call join again and assert, via typia.assert() and TestValidator.equals(),
 *    that the second authorized.display_name matches the second request, and
 *    that the two guest identities have different ids (so that we know we
 *    didn’t accidentally reuse the first response).
 */
export async function test_api_guest_user_join_with_display_name(
  connection: api.IConnection,
) {
  // 1. First join with a concrete display_name
  const firstDisplayName = "Guest Ninja";
  const firstJoinBody = {
    display_name: firstDisplayName,
  } satisfies ITodoAppGuestUser.IJoin;

  const firstAuthorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: firstJoinBody,
    });

  // Validate full structure
  typia.assert(firstAuthorized);

  // Validate echo of display_name
  TestValidator.equals(
    "guest join echoes first display_name",
    firstAuthorized.display_name,
    firstDisplayName,
  );

  // 2. Second join with a different display_name
  const secondDisplayName = "Guest Samurai";
  const secondJoinBody = {
    display_name: secondDisplayName,
  } satisfies ITodoAppGuestUser.IJoin;

  const secondAuthorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: secondJoinBody,
    });

  typia.assert(secondAuthorized);

  TestValidator.equals(
    "guest join echoes second display_name",
    secondAuthorized.display_name,
    secondDisplayName,
  );

  // Ensure the two guest identities are distinct
  TestValidator.notEquals(
    "each guest join should yield a distinct guest id",
    firstAuthorized.id,
    secondAuthorized.id,
  );
}
