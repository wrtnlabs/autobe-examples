import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin refresh request when the refresh token field is missing from the
 * request payload. This scenario validates proper validation of required fields
 * and ensures the API returns appropriate validation errors instead of
 * processing malformed requests. Should verify that missing required fields
 * trigger validation errors with helpful error messaging without exposing
 * internal system implementation details.
 *
 * Note: Since refresh_token is a required field in IShoppingMallAdmin.IRefresh
 * interface, we cannot actually test "missing" the field in TypeScript.
 * Instead, we test the scenario by using invalid refresh tokens that should
 * trigger validation errors from the server.
 */
export async function test_api_admin_refresh_missing_token(
  connection: api.IConnection,
) {
  // Test with an obviously invalid refresh token format
  const invalidTokenRequest = {
    refresh_token: "invalid-token-format",
  } satisfies IShoppingMallAdmin.IRefresh;

  await TestValidator.error(
    "should fail with invalid refresh token format",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: invalidTokenRequest,
      });
    },
  );

  // Test with empty string refresh token
  const emptyTokenRequest = {
    refresh_token: "",
  } satisfies IShoppingMallAdmin.IRefresh;

  await TestValidator.error(
    "should fail with empty refresh token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: emptyTokenRequest,
      });
    },
  );

  // Test with random UUID that doesn't correspond to any valid session
  const randomTokenRequest = {
    refresh_token: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallAdmin.IRefresh;

  await TestValidator.error(
    "should fail with non-existent refresh token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: randomTokenRequest,
      });
    },
  );
}
