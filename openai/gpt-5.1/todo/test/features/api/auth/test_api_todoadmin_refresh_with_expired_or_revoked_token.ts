import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminRefresh";

/**
 * Validate that todoAdmin refresh attempts with invalid/expired-style tokens
 * are rejected and do not yield new authorized contexts.
 *
 * ## Business intent
 *
 * The `/auth/todoAdmin/refresh` endpoint must only succeed for valid,
 * non-revoked refresh tokens mapped to active todoAdmin sessions. Any other
 * refresh token (expired, revoked, or completely unknown) must be rejected
 * without issuing a new `ITodoAppTodoAdmin.IAuthorized` context.
 *
 * Within this isolated test context we cannot mint real refresh tokens or
 * directly manipulate session tables, so we approximate the "expired" and
 * "revoked" cases using obviously invalid opaque strings. The system must still
 * treat these as invalid and fail the refresh attempt.
 *
 * ## Test steps
 *
 * 1. Construct two distinct, random refresh token strings to represent:
 *
 *    - An "expired" token
 *    - A "revoked" token
 * 2. For each of these invalid tokens, build a valid
 *    `ITodoAppTodoAdminRefresh.IRequest` body and call
 *    `api.functional.auth.todoAdmin.refresh` inside `TestValidator.error`:
 *
 *    - The call must throw an error (backend rejects the refresh token).
 *    - We do not inspect status codes or error bodies, only that an error occurs.
 * 3. Do not perform any header or DB inspection, in line with the SDK ownership of
 *    `connection.headers` and absence of DB APIs.
 */
export async function test_api_todoadmin_refresh_with_expired_or_revoked_token(
  connection: api.IConnection,
) {
  // 1. Prepare two distinct invalid refresh tokens (opaque random strings).
  const expiredLikeToken: string = RandomGenerator.alphaNumeric(64);
  const revokedLikeToken: string = RandomGenerator.alphaNumeric(64);

  // Ensure they are distinct for clarity (extremely unlikely to collide,
  // but we can cheaply guard against it).
  const distinctRevokedLikeToken: string =
    revokedLikeToken === expiredLikeToken
      ? RandomGenerator.alphaNumeric(32)
      : revokedLikeToken;

  // 2. Attempt refresh with the "expired"-style token and expect failure.
  await TestValidator.error(
    "todoAdmin refresh should fail for expired-like token",
    async () => {
      const body = {
        refresh_token: expiredLikeToken,
      } satisfies ITodoAppTodoAdminRefresh.IRequest;

      await api.functional.auth.todoAdmin.refresh(connection, { body });
    },
  );

  // 3. Attempt refresh with the "revoked"-style token and expect failure.
  await TestValidator.error(
    "todoAdmin refresh should fail for revoked-like token",
    async () => {
      const body = {
        refresh_token: distinctRevokedLikeToken,
      } satisfies ITodoAppTodoAdminRefresh.IRequest;

      await api.functional.auth.todoAdmin.refresh(connection, { body });
    },
  );
}
