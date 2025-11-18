import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate adminUser token refresh rotation and reuse limits.
 *
 * This test exercises the POST /auth/adminUser/refresh endpoint as a token
 * lifecycle operation for administrative users. It verifies that repeated
 * refresh calls rotate the issued token bundle and that the session-related
 * timestamps evolve coherently, while also optionally checking that old refresh
 * tokens cannot be reused after rotation.
 *
 * High-level steps:
 *
 * 1. Bootstrap an initial admin authorization context via a first refresh call
 *    using a randomly generated ITodoAppAdminUser.IRefresh payload. Treat the
 *    result as the "original" authorized state.
 * 2. Perform a second refresh using the original refresh token and capture the
 *    rotated token bundle as response1.
 * 3. Verify that response1 is a valid ITodoAppAdminUser.IAuthorized object and
 *    that its token bundle differs appropriately from the original one (at
 *    least access token rotated, ideally refresh as well).
 * 4. Perform a third refresh using the newest refresh token from response1 and
 *    capture response2, ensuring that access token (and preferably refresh
 *    token) have rotated again.
 * 5. Check that the temporal fields expired_at and refreshable_until move forward
 *    or remain non-decreasing across the sequence of refresh calls, reflecting
 *    a consistent session window.
 * 6. Optionally attempt to reuse the original refresh token after it has already
 *    been used for rotation and ensure that some error is raised, indicating
 *    replay protection for stale tokens.
 */
export async function test_api_admin_user_token_refresh_rotates_tokens_and_limits_reuse(
  connection: api.IConnection,
) {
  // 1. Bootstrap an initial authorized admin context using refresh
  //    with a random ITodoAppAdminUser.IRefresh payload. In real
  //    deployments this would come from an earlier login/join flow,
  //    but here we rely on the SDK/simulator to provide a valid
  //    ITodoAppAdminUser.IAuthorized structure.
  const initialRefreshBody = {
    refresh_token: RandomGenerator.alphaNumeric(64),
  } satisfies ITodoAppAdminUser.IRefresh;

  const original: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: initialRefreshBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(original);
  typia.assert<IAuthorizationToken>(original.token);

  const originalAccess: string = original.token.access;
  const originalRefresh: string = original.token.refresh;
  const originalExpiredAt: string = original.token.expired_at;
  const originalRefreshableUntil: string = original.token.refreshable_until;

  // 2. First rotation: use the original refresh token to obtain
  //    a new token bundle.
  const firstRotationBody = {
    refresh_token: originalRefresh,
  } satisfies ITodoAppAdminUser.IRefresh;

  const response1: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: firstRotationBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(response1);
  typia.assert<IAuthorizationToken>(response1.token);

  const access1: string = response1.token.access;
  const refresh1: string = response1.token.refresh;
  const expiredAt1: string = response1.token.expired_at;
  const refreshableUntil1: string = response1.token.refreshable_until;

  // Access token should rotate at minimum.
  TestValidator.notEquals(
    "access token must rotate on first refresh",
    originalAccess,
    access1,
  );

  // Refresh token is generally expected to rotate as well, although
  // some implementations may keep it stable. We still assert that it
  // changes to encourage strict rotation semantics; if the backend
  // intentionally keeps it identical, this assertion will surface that
  // design choice.
  TestValidator.notEquals(
    "refresh token should rotate on first refresh (if rotation is enabled)",
    originalRefresh,
    refresh1,
  );

  // Temporal fields should not go backwards.
  TestValidator.predicate(
    "expired_at after first refresh must be >= original",
    new Date(expiredAt1).getTime() >= new Date(originalExpiredAt).getTime(),
  );
  TestValidator.predicate(
    "refreshable_until after first refresh must be >= original",
    new Date(refreshableUntil1).getTime() >=
      new Date(originalRefreshableUntil).getTime(),
  );

  // 3. Second rotation: use the latest refresh token from response1.
  const secondRotationBody = {
    refresh_token: refresh1,
  } satisfies ITodoAppAdminUser.IRefresh;

  const response2: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: secondRotationBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(response2);
  typia.assert<IAuthorizationToken>(response2.token);

  const access2: string = response2.token.access;
  const refresh2: string = response2.token.refresh;
  const expiredAt2: string = response2.token.expired_at;
  const refreshableUntil2: string = response2.token.refreshable_until;

  // Access token should rotate again.
  TestValidator.notEquals(
    "access token must rotate on second refresh",
    access1,
    access2,
  );

  // Ideally, the second refresh token also differs from the first.
  TestValidator.notEquals(
    "refresh token should rotate on second refresh (if rotation is enabled)",
    refresh1,
    refresh2,
  );

  // Confirm that the newest tokens are not equal to the very original ones.
  TestValidator.notEquals(
    "second access token must differ from original access token",
    originalAccess,
    access2,
  );
  TestValidator.notEquals(
    "second refresh token should differ from original refresh token",
    originalRefresh,
    refresh2,
  );

  // Temporal progression: non-decreasing over second rotation as well.
  TestValidator.predicate(
    "expired_at after second refresh must be >= first",
    new Date(expiredAt2).getTime() >= new Date(expiredAt1).getTime(),
  );
  TestValidator.predicate(
    "refreshable_until after second refresh must be >= first",
    new Date(refreshableUntil2).getTime() >=
      new Date(refreshableUntil1).getTime(),
  );

  // 4. Optional replay protection: attempt to reuse the original
  //    refresh token after it has been consumed in the first
  //    rotation. If the backend enforces single-use refresh tokens
  //    following rotation, this should result in an error.
  await TestValidator.error(
    "reusing original refresh token after rotation should fail (if replay protection is enforced)",
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: {
          refresh_token: originalRefresh,
        } satisfies ITodoAppAdminUser.IRefresh,
      });
    },
  );
}
