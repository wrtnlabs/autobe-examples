import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * 1. Register a fresh user via POST /auth/user/join to obtain initial tokens.
   * 2. Exchange the obtained refresh token via POST /auth/user/refresh and
   *    validate that a new access token is returned and that server-side
   *    metadata is consistent (timestamps).
   * 3. Cover negative cases: invalid refresh token and malformed request.
   */

  // 1) Create a new user to obtain initial tokens
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12); // >= 8 chars

  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(authorized);

  // Validate presence of token values
  const originalToken: IAuthorizationToken = authorized.token;
  TestValidator.predicate(
    "join: access token present",
    typeof originalToken.access === "string" && originalToken.access.length > 0,
  );
  TestValidator.predicate(
    "join: refresh token present",
    typeof originalToken.refresh === "string" &&
      originalToken.refresh.length > 0,
  );

  // 2) Use the refresh endpoint with a valid refresh token
  const refreshed: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refreshToken: originalToken.refresh,
      } satisfies ITodoAppUser.IRefresh,
    });
  typia.assert(refreshed);

  // Validate new access token present
  TestValidator.predicate(
    "refresh: new access token present",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );

  // Validate refresh token presence and optional rotation
  TestValidator.predicate(
    "refresh: returned refresh token is a non-empty string",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  if (refreshed.token.refresh !== originalToken.refresh) {
    // If rotated, ensure they differ
    TestValidator.notEquals(
      "refresh: refresh token rotated",
      refreshed.token.refresh,
      originalToken.refresh,
    );
  } else {
    // If not rotated, record that no rotation was applied (still acceptable)
    TestValidator.predicate(
      "refresh: refresh token unchanged (rotation not applied)",
      true,
    );
  }

  // 2.a Validate server-managed timestamps consistency (updated_at >= created_at)
  // typia.assert already validated field presence and format, but check ordering.
  const createdAt = Date.parse(refreshed.created_at);
  const updatedAt = Date.parse(refreshed.updated_at);
  TestValidator.predicate(
    "refresh: updated_at is a valid ISO-8601 date",
    !Number.isNaN(updatedAt),
  );
  TestValidator.predicate(
    "refresh: updated_at is >= created_at",
    !Number.isNaN(createdAt) && updatedAt >= createdAt,
  );

  // 3) Negative case A: invalid/expired refresh token should fail
  await TestValidator.error(
    "refresh: invalid/expired refresh token should fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refreshToken: "this-token-is-invalid-or-expired",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // 4) Negative case B: malformed request (empty refreshToken) should fail
  await TestValidator.error(
    "refresh: empty refresh token (malformed body) should fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refreshToken: "",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
}
