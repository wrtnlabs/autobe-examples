import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate successful user registration via POST /auth/user/join.
 *
 * Business context:
 *
 * - This test verifies the happy-path registration flow where a client provides a
 *   valid email, a plaintext password (minimum length 8), and an optional
 *   display name. The server should create the user record, return a fully
 *   populated authorization payload (including access and refresh tokens), and
 *   include server-managed timestamps and identifiers.
 *
 * Steps:
 *
 * 1. Generate a unique email and a strong password.
 * 2. Send POST /auth/user/join with body satisfying ITodoAppUser.ICreate.
 * 3. Await the response and assert its shape with typia.assert().
 * 4. Validate business invariants: returned email/display_name, token presence,
 *    and updated_at >= created_at.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // 1) Prepare unique, valid request data
  const email = `e2e+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const display_name = RandomGenerator.name();

  const requestBody = {
    email,
    password,
    display_name,
  } satisfies ITodoAppUser.ICreate;

  // 2) Call the join API
  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: requestBody,
    });

  // 3) Runtime type validation (full schema assertion)
  typia.assert(authorized);

  // 4) Business validations
  TestValidator.equals(
    "returned email matches request",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "returned display_name matches request",
    authorized.display_name,
    display_name,
  );

  // token presence: typia.assert guarantees types, but assert non-empty semantics
  TestValidator.predicate(
    "access token should be non-empty",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // Timestamps: typia.assert already validated date-time format; check business order
  const createdAt = Date.parse(authorized.created_at);
  const updatedAt = Date.parse(authorized.updated_at);
  TestValidator.predicate(
    "updated_at must be equal or after created_at",
    updatedAt >= createdAt,
  );

  // Optionally validate that user summary (if present) echoes the email
  if (authorized.user !== undefined && authorized.user !== null) {
    TestValidator.equals(
      "embedded user summary email matches",
      authorized.user.email,
      email,
    );
  }
}
