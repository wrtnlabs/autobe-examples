import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test required field validation for guest token refresh endpoint.
 *
 * This test validates that the refresh endpoint properly rejects requests with
 * invalid refresh tokens. Since TypeScript compilation prevents testing truly
 * missing required fields (which would cause type errors), this test focuses on
 * business logic validation by testing with empty or invalid refresh token
 * values.
 *
 * The test verifies that the API properly validates the refresh_token field and
 * returns appropriate errors when the token value is invalid, ensuring the
 * endpoint enforces proper authentication security.
 */
export async function test_api_guest_token_refresh_missing_token(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );
}
