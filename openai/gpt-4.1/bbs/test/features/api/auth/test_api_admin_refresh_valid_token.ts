import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validates that an authenticated active admin can successfully refresh JWT
 * tokens.
 *
 * Steps:
 *
 * 1. Prepare a valid admin refresh token (simulate an active session).
 * 2. Call POST /auth/admin/refresh with the valid refresh token.
 * 3. Assert the response is an IDiscussionBoardAdmin.IAuthorized object.
 * 4. Assert deleted_at is null or undefined to confirm account is active.
 */
export async function test_api_admin_refresh_valid_token(
  connection: api.IConnection,
) {
  // 1. Prepare a valid refresh token using typia.random
  const refreshInput = {
    refresh_token: typia.random<string>(),
  } satisfies IDiscussionBoardAdmin.IRefresh;

  // 2. Call the admin refresh endpoint
  const output: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshInput,
    });
  typia.assert(output);

  // 3. Assert deleted_at is null/undefined (account must be active)
  TestValidator.equals(
    "deleted_at should be null or undefined",
    output.deleted_at ?? null,
    null,
  );
}
