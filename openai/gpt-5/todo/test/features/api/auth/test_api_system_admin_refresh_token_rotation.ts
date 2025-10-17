import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";

export async function test_api_system_admin_refresh_token_rotation(
  connection: api.IConnection,
) {
  /**
   * Validate that a system administrator can renew authorization via refresh
   * token.
   *
   * Steps:
   *
   * 1. Join as a brand new system admin to obtain initial token set
   * 2. Call refresh with the issued refresh token
   * 3. Ensure identity and record timestamps are stable across refresh
   * 4. Ensure access token is rotated (different from the original)
   * 5. Negative: refreshing with a modified token must fail
   * 6. Optional sanity: refresh again with the newly returned refresh token
   */

  // 1) Join a new system admin and capture the initial authorization payload
  const createBody = typia.random<ITodoListSystemAdmin.ICreate>();
  const initial = await api.functional.auth.systemAdmin.join(connection, {
    body: createBody satisfies ITodoListSystemAdmin.ICreate,
  });
  typia.assert(initial);

  // 2) Refresh with the valid refresh token
  const refreshed = await api.functional.auth.systemAdmin.refresh(connection, {
    body: {
      refresh_token: initial.token.refresh,
    } satisfies ITodoListSystemAdmin.IRefresh,
  });
  typia.assert(refreshed);

  // 3) Identity and record invariants must hold
  TestValidator.equals("refresh retains admin id", refreshed.id, initial.id);
  TestValidator.equals(
    "refresh retains admin email",
    refreshed.email,
    initial.email,
  );
  TestValidator.equals(
    "refresh retains created_at timestamp",
    refreshed.created_at,
    initial.created_at,
  );
  TestValidator.equals(
    "refresh retains updated_at timestamp",
    refreshed.updated_at,
    initial.updated_at,
  );

  // 4) Access token must be rotated
  TestValidator.notEquals(
    "access token must rotate after refresh",
    refreshed.token.access,
    initial.token.access,
  );

  // 5) Negative: modified/invalid refresh token must be rejected
  await TestValidator.error("invalid refresh token must fail", async () => {
    await api.functional.auth.systemAdmin.refresh(connection, {
      body: {
        refresh_token: `${initial.token.refresh}x`,
      } satisfies ITodoListSystemAdmin.IRefresh,
    });
  });

  // 6) Optional sanity: refresh again with the new refresh token
  const refreshed2 = await api.functional.auth.systemAdmin.refresh(connection, {
    body: {
      refresh_token: refreshed.token.refresh,
    } satisfies ITodoListSystemAdmin.IRefresh,
  });
  typia.assert(refreshed2);
  TestValidator.equals(
    "id stable across second refresh",
    refreshed2.id,
    initial.id,
  );
  TestValidator.notEquals(
    "second refresh yields different access token",
    refreshed2.token.access,
    refreshed.token.access,
  );
}
