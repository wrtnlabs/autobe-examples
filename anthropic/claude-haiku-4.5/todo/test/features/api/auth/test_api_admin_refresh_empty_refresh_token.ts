import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_refresh_empty_refresh_token(
  connection: api.IConnection,
) {
  // Test that the refresh endpoint rejects empty refresh tokens
  // Empty refresh tokens must fail validation as they don't represent valid credentials
  // This ensures the API enforces required field validation for token refresh operations
  await TestValidator.error(
    "refresh endpoint should reject empty refresh token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ITodoAppAdmin.IRefresh,
      });
    },
  );
}
