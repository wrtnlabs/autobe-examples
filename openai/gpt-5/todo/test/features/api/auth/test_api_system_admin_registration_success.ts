import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";

/**
 * Validate successful system administrator registration flow.
 *
 * Business goals:
 *
 * - Submitting mixed-case email should yield a normalized lowercase email in the
 *   identity.
 * - A new administrator identity (UUID) is issued with valid timestamps.
 * - Authorization token payload is returned with non-empty access/refresh tokens.
 * - Temporal invariant: updated_at is not earlier than created_at.
 * - When embedded admin profile is present, it is active (deleted_at null) and
 *   mirrors identity fields.
 *
 * Steps:
 *
 * 1. Build a mixed-case email based on a valid randomized email and a strong
 *    password.
 * 2. Call POST /auth/systemAdmin/join with ITodoListSystemAdmin.ICreate.
 * 3. Assert response type (IAuthorized) and perform business validations.
 */
export async function test_api_system_admin_registration_success(
  connection: api.IConnection,
) {
  // 1) Prepare mixed-case email and strong password
  const baseEmail = typia.random<string & tags.Format<"email">>();
  const mixedEmail = (() => {
    // Convert some characters to upper-case, preserving '@' separation
    const [local, domain] = baseEmail.split("@");
    const toMixed = (s: string) =>
      s
        .split("")
        .map((ch, idx) => (idx % 2 === 0 ? ch.toUpperCase() : ch))
        .join("");
    return `${toMixed(local)}@${toMixed(domain)}`;
  })();
  const expectedLower = mixedEmail.toLowerCase();

  const joinBody = {
    email: typia.assert<string & tags.Format<"email">>(mixedEmail),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoListSystemAdmin.ICreate;

  // 2) Call join endpoint
  const authorized = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });

  // 3) Type assertion for the full authorization payload
  typia.assert<ITodoListSystemAdmin.IAuthorized>(authorized);

  // Business validations
  // Email normalization
  TestValidator.equals(
    "email is normalized to lowercase",
    authorized.email,
    expectedLower,
  );

  // Temporal invariant: updated_at should be >= created_at
  const createdAtMs: number = new Date(authorized.created_at).getTime();
  const updatedAtMs: number = new Date(authorized.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is not before created_at",
    updatedAtMs >= createdAtMs,
  );

  // Token sanity checks (non-empty strings)
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );

  // Token temporal relation: refreshable_until should be after or equal to expired_at
  const accessExpiredMs: number = new Date(
    authorized.token.expired_at,
  ).getTime();
  const refreshableUntilMs: number = new Date(
    authorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until is not before expired_at",
    refreshableUntilMs >= accessExpiredMs,
  );

  // Optional embedded admin profile validations (when provided)
  const admin = authorized.admin;
  if (admin !== undefined) {
    typia.assertGuard<ITodoListSystemAdmin>(admin!);
    TestValidator.equals(
      "admin email mirrors authorized email",
      admin.email,
      authorized.email,
    );
    TestValidator.equals(
      "new admin is active (deleted_at is null)",
      admin.deleted_at ?? null,
      null,
    );
    TestValidator.equals(
      "admin.created_at equals authorized.created_at",
      admin.created_at,
      authorized.created_at,
    );
    TestValidator.equals(
      "admin.updated_at equals authorized.updated_at",
      admin.updated_at,
      authorized.updated_at,
    );
  }
}
