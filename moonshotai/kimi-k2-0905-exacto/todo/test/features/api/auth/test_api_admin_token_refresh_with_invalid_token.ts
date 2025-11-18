import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test refresh attempt using an invalid, malformed, or revoked refresh token.
 * Should be rejected without issuing tokens, confirming strict refresh token
 * validation and session linkage enforcement.
 */
export async function test_api_admin_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // 1. Attempt with a completely random string as refresh token (obvious invalid format)
  await TestValidator.error(
    "refresh with clearly invalid refresh token fails",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphabets(32),
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );

  // 2. Attempt with a long valid-looking string (not attached to any valid session)
  await TestValidator.error(
    "refresh with random valid-looking but unlinked token fails",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );

  // 3. Attempt with a string that matches possible JWT structure (but certainly not issued)
  const fakeJwt = [
    RandomGenerator.alphaNumeric(24),
    RandomGenerator.alphaNumeric(32),
    RandomGenerator.alphaNumeric(32),
  ].join(".");
  await TestValidator.error(
    "refresh with fabricated JWT-format token fails",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: fakeJwt,
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );
}
