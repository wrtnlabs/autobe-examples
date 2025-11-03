import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test refreshing JWT tokens for an admin with an active session.
 *
 * 1. Register a new admin via the join endpoint and receive the initial access &
 *    refresh tokens.
 * 2. Use the valid refresh token from the join response to call the refresh API.
 * 3. Validate that new access/refresh tokens are issued and are correctly formed.
 * 4. Confirm session rotation: the new refresh token is different from the
 *    previous one.
 * 5. Confirm the admin account remains active and has not been deleted.
 * 6. Assert that all critical fields in the admin and token DTOs are present and
 *    valid.
 */
export async function test_api_admin_refresh_token_with_valid_session(
  connection: api.IConnection,
) {
  // 1. Register a new admin (to get valid tokens)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const requestBody = {
    email: adminEmail,
    password: password satisfies string &
      tags.MinLength<8> &
      tags.MaxLength<128>,
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;

  const joinResult: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: requestBody });
  typia.assert(joinResult);
  TestValidator.equals(
    "returned email matches input",
    joinResult.email,
    adminEmail,
  );
  TestValidator.equals(
    "returned role matches input",
    joinResult.role,
    requestBody.role,
  );
  TestValidator.equals(
    "admin account should be active",
    joinResult.status,
    "active",
  );
  TestValidator.equals(
    "admin account not deleted",
    joinResult.deleted_at,
    null,
  );
  TestValidator.predicate(
    "newly created admin id is a uuid",
    typeof joinResult.id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(joinResult.id),
  );

  // 2. Refresh tokens with the valid refresh token
  const refreshBody = {
    refresh_token: joinResult.token.refresh,
  } satisfies IShoppingAdmin.IRefresh;
  const refreshed: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: refreshBody });
  typia.assert(refreshed);
  TestValidator.equals(
    "refreshed email matches original",
    refreshed.email,
    adminEmail,
  );
  TestValidator.equals(
    "refreshed admin id matches original",
    refreshed.id,
    joinResult.id,
  );
  TestValidator.notEquals(
    "refresh token has been rotated",
    refreshed.token.refresh,
    joinResult.token.refresh,
  );
  TestValidator.notEquals(
    "access token has been rotated",
    refreshed.token.access,
    joinResult.token.access,
  );
  TestValidator.equals(
    "account status remains active",
    refreshed.status,
    "active",
  );
  TestValidator.equals(
    "admin still not deleted after refresh",
    refreshed.deleted_at,
    null,
  );
  TestValidator.predicate(
    "refreshed admin id is a uuid",
    typeof refreshed.id === "string" && /^[0-9a-fA-F-]{36}$/.test(refreshed.id),
  );
  TestValidator.equals(
    "issued email still matches",
    refreshed.email,
    adminEmail,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  // Check the expired_at and refreshable_until are ISO date-time strings
  TestValidator.predicate(
    "expired_at on access token is ISO string",
    typeof refreshed.token.expired_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        refreshed.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "refreshable_until on token is ISO string",
    typeof refreshed.token.refreshable_until === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        refreshed.token.refreshable_until,
      ),
  );
}
