import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that the adminUser refresh endpoint returns a well-typed
 * ITodoAppAdminUser.IAuthorized payload for a structurally valid
 * ITodoAppAdminUser.IRefresh request.
 *
 * Original business intent was to ensure that logically deleted or disabled
 * admin accounts cannot refresh tokens. However, the current SDK surface only
 * exposes POST /auth/adminUser/refresh without any admin join/login or
 * account‑lifecycle APIs, and there is no supported way to mark an admin as
 * disabled or deleted in this test. Also, the simulator implementation of
 * refresh always returns a random authorized payload on success and does not
 * expose error cases.
 *
 * Therefore this test focuses on the parts we can robustly exercise:
 *
 * 1. Build a structurally valid ITodoAppAdminUser.IRefresh request using
 *    typia.random so that it always respects the DTO contract.
 * 2. Call api.functional.auth.adminUser.refresh with that body and await the
 *    response.
 * 3. Validate, via typia.assert, that the response is a correct
 *    ITodoAppAdminUser.IAuthorized value (including nested token structure).
 *
 * This keeps the test compilable and deterministic within the current API
 * surface while still validating that the refresh contract is wired correctly
 * and that the SDK and DTOs agree on shapes.
 */
export async function test_api_admin_user_token_refresh_for_deleted_or_disabled_account(
  connection: api.IConnection,
) {
  // 1. Prepare a structurally valid refresh request body
  const refreshBody = typia.random<ITodoAppAdminUser.IRefresh>();

  // 2. Call the refresh endpoint
  const authorized = await api.functional.auth.adminUser.refresh(connection, {
    body: refreshBody,
  });

  // 3. Validate response type strictly
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);
}
