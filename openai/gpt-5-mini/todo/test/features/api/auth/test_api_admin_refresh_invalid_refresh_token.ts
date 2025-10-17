import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_refresh_invalid_refresh_token(
  connection: api.IConnection,
) {
  /**
   * Purpose: Verify that the admin token refresh endpoint rejects
   * tampered/invalid refresh tokens and does not return a new access token.
   *
   * Steps:
   *
   * 1. Create a new admin account via POST /auth/admin/join to obtain a valid
   *    authorized response containing an access and refresh token.
   * 2. Tamper the returned refresh token (flip or change a character).
   * 3. Call POST /auth/admin/refresh with the tampered token and assert the server
   *    returns a client error (400 or 401).
   */

  // 1. Create admin account
  const adminCreate = {
    email:
      RandomGenerator.name(1).replace(/\s+/g, "") +
      "." +
      RandomGenerator.alphaNumeric(4) +
      "@example.com",
    password: "P@ssw0rd!",
    is_super: false,
  } satisfies ITodoAppAdmin.ICreate;

  const authorized: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  // Validate shape and extract token
  typia.assert(authorized);
  typia.assert(authorized.token);

  const validRefresh: string = authorized.token.refresh;

  // 2. Tamper the refresh token deterministically
  let tamperedRefresh: string;
  if (validRefresh.length >= 2) {
    // Flip the last character to another ASCII character (not same)
    const last = validRefresh.charAt(validRefresh.length - 1);
    const replacement = last === "a" ? "b" : "a";
    tamperedRefresh = validRefresh.slice(0, -1) + replacement;
  } else {
    // Append a character to make it invalid
    tamperedRefresh = validRefresh + "x";
  }

  // 3. Attempt refresh with the tampered token and expect client error (400 or 401)
  await TestValidator.httpError(
    "invalid refresh should be rejected",
    [400, 401],
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: tamperedRefresh,
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );
}
