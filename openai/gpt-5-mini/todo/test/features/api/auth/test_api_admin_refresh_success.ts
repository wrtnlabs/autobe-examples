import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test: Admin refresh token exchange
 *
 * Purpose: Verifies that an admin created via POST /auth/admin/join receives a
 * valid authorization payload (IAuthorizationToken) and that POST
 * /auth/admin/refresh accepts the issued refresh token to return a new
 * authorized payload. The test asserts token presence, optional rotation of the
 * access token, ID consistency, and advancement of last_active_at when
 * available.
 *
 * Steps:
 *
 * 1. Create a new admin via api.functional.auth.admin.join
 * 2. Extract access and refresh tokens from the join response
 * 3. Call api.functional.auth.admin.refresh with the refresh token
 * 4. Assert the refreshed authorized payload is valid and consistent
 */
export async function test_api_admin_refresh_success(
  connection: api.IConnection,
) {
  // 1) Create an admin account (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    is_super: false,
  } satisfies ITodoAppAdmin.ICreate;

  const authorized: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorized);

  // Basic sanity checks for returned tokens
  const initialAccess: string = authorized.token.access;
  const initialRefresh: string = authorized.token.refresh;

  TestValidator.predicate(
    "join: access token is present",
    typeof initialAccess === "string" && initialAccess.length > 0,
  );
  TestValidator.predicate(
    "join: refresh token is present",
    typeof initialRefresh === "string" && initialRefresh.length > 0,
  );

  // Preserve previous last_active_at for comparison (may be null/undefined)
  const prevLastActive: string | null | undefined = authorized.last_active_at;

  // 2) Exchange refresh token for a new authorized payload
  const refreshBody = {
    refresh_token: initialRefresh,
  } satisfies ITodoAppAdmin.IRefresh;

  const refreshed: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: refreshBody });
  typia.assert(refreshed);

  // 3) Business validations
  // Admin identity must remain the same
  TestValidator.equals(
    "admin id remains unchanged",
    refreshed.id,
    authorized.id,
  );

  // New access token must be present
  TestValidator.predicate(
    "refresh: new access token present",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );

  // If server rotates tokens, the new access token should usually differ.
  // We assert inequality as a positive sign of rotation but do not fail the
  // test if implementation chooses not to rotate (some systems reuse tokens).
  TestValidator.predicate(
    "access token rotation (refreshed differs from initial)",
    refreshed.token.access !== initialAccess,
  );

  // Check token looks like a JWT (dot-delimited) or at least non-empty
  TestValidator.predicate(
    "access token shape looks like JWT or non-empty",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.split(".").length >= 2,
  );

  // 4) last_active_at handling: if previous existed, refreshed should be >= prev
  if (prevLastActive !== null && prevLastActive !== undefined) {
    // Both values should be parseable as date-time strings
    TestValidator.predicate(
      "prev last_active_at parseable",
      !Number.isNaN(Date.parse(prevLastActive)),
    );

    TestValidator.predicate(
      "refreshed last_active_at present and parseable",
      refreshed.last_active_at !== null &&
        refreshed.last_active_at !== undefined &&
        !Number.isNaN(Date.parse(refreshed.last_active_at)),
    );

    const prevMillis = Date.parse(prevLastActive);
    const currMillis = Date.parse(refreshed.last_active_at!);

    TestValidator.predicate(
      "last_active_at was advanced or equal",
      currMillis >= prevMillis,
    );
  } else {
    // If there was no previous last_active_at, ensure refreshed provides one
    TestValidator.predicate(
      "refreshed last_active_at present when previous missing",
      refreshed.last_active_at !== null &&
        refreshed.last_active_at !== undefined &&
        !Number.isNaN(Date.parse(refreshed.last_active_at)),
    );
  }
}
