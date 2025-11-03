import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_refresh_success_and_invalid_token(
  connection: api.IConnection,
) {
  /**
   * E2E: Admin refresh happy path and invalid-token negative cases.
   *
   * Steps:
   *
   * 1. Register a fresh admin (POST /auth/admin/join) to obtain initial access +
   *    refresh tokens
   * 2. Call POST /auth/admin/refresh with the captured refresh token and validate
   *    returned IAuthorized
   * 3. Negative cases: malformed token and random well-formed token should produce
   *    errors
   */

  // 1) Register a fresh admin to obtain initial tokens
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.ICreate;

  const joined: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(joined);

  // Capture issued tokens
  const initialAccess = joined.token.access;
  const initialRefresh = joined.token.refresh;

  // Sanity validations
  TestValidator.predicate(
    "join returned access token",
    typeof initialAccess === "string" && initialAccess.length > 0,
  );
  TestValidator.predicate(
    "join returned refresh token",
    typeof initialRefresh === "string" && initialRefresh.length > 0,
  );

  // 2) Happy path: refresh with the captured refresh token
  const refreshed: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: { refresh_token: initialRefresh } satisfies ITodoAppAdmin.IRefresh,
    });
  typia.assert(refreshed);

  // Validate refreshed tokens and identity
  TestValidator.predicate(
    "refresh returned access token",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );

  // Access token rotation is implementation-dependent. If rotation occurred, assert inequality;
  // otherwise ensure access token exists (already asserted above).
  if (refreshed.token.access !== initialAccess) {
    TestValidator.notEquals(
      "access token was rotated",
      refreshed.token.access,
      initialAccess,
    );
  } else {
    TestValidator.predicate(
      "access token present after refresh",
      refreshed.token.access.length > 0,
    );
  }

  // Refresh token rotation check (optional): if rotated, ensure differs from initial; otherwise assert presence
  TestValidator.predicate(
    "refresh token present after refresh",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  if (refreshed.token.refresh !== initialRefresh) {
    TestValidator.notEquals(
      "refresh token was rotated",
      refreshed.token.refresh,
      initialRefresh,
    );
  }

  // Admin identity checks
  TestValidator.predicate("admin is active", refreshed.is_active === true);

  // 3) Negative case A: malformed / tampered refresh token
  await TestValidator.error("malformed refresh token should fail", async () => {
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: "not-a-valid-refresh-token",
      } satisfies ITodoAppAdmin.IRefresh,
    });
  });

  // 4) Negative case B: well-formed but unknown refresh token (random)
  const randomToken = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "random unknown refresh token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: { refresh_token: randomToken } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );

  // 5) Missing-token case: intentionally omitted (framework-level validation); document and skip
}
