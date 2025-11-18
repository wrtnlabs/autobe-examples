import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate successful administrator registration and initial authorization
 * payload.
 *
 * Business goal:
 *
 * - Ensure POST /auth/admin/join correctly creates a new admin account and
 *   returns a fully-populated IShoppingMallAdmin.IAuthorized structure with
 *   usable JWT tokens and coherent identity metadata.
 *
 * Steps:
 *
 * 1. Build a realistic IShoppingMallAdminJoin.ICreate request body, using a unique
 *    email and strong password. Provide href and referrer as proper
 *    URI-formatted URLs. Intentionally omit ip to exercise the branch where the
 *    backend derives or tolerates a missing client IP.
 * 2. Call api.functional.auth.admin.join(connection, { body }) and assert the
 *    response type via typia.assert<IShoppingMallAdmin.IAuthorized>(output).
 * 3. Verify that the token object (IAuthorizationToken) has non-empty access and
 *    refresh strings.
 * 4. Parse expired_at and refreshable_until as Date objects to validate they are
 *    valid ISO 8601 timestamps in the future relative to now.
 * 5. Validate scalar identity fields on the authorization payload:
 *
 *    - Id is a UUID (typia.assert already guarantees format, but we also keep it as
 *         a string & tags.Format<"uuid">).
 *    - Email exactly matches the submitted email.
 *    - Deleted_at is null, representing an active admin.
 *    - Created_at and updated_at are valid date-time strings, with updated_at >=
 *         created_at.
 * 6. If the nested admin summary object is present, assert its type and verify
 *    that all mirrored fields (id, email, status, email_verified, created_at,
 *    updated_at, deleted_at) match those of the top-level
 *    IShoppingMallAdmin.IAuthorized.
 *
 * Error scenarios (duplicate email, weak password, etc.) are out of scope for
 * this particular test and are covered by separate negative-path tests.
 */
export async function test_api_admin_join_successful_registration_and_auto_login(
  connection: api.IConnection,
) {
  // 1. Build join request body
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const body = {
    email,
    password,
    // ip intentionally omitted to exercise optional behavior
    href,
    referrer,
  } satisfies IShoppingMallAdminJoin.ICreate;

  // 2. Call join endpoint
  const output: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body });

  // 3. Type assertion on the entire authorization payload
  typia.assert<IShoppingMallAdmin.IAuthorized>(output);

  // 4. Validate token structure and basic semantics
  const token: IAuthorizationToken = output.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "admin join: token.access must be non-empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "admin join: token.refresh must be non-empty",
    token.refresh.length > 0,
  );

  const now: number = Date.now();
  const expiredAt: number = new Date(token.expired_at).getTime();
  const refreshableUntil: number = new Date(token.refreshable_until).getTime();

  TestValidator.predicate(
    "admin join: token.expired_at must be a valid future date-time",
    Number.isFinite(expiredAt) && expiredAt > now,
  );
  TestValidator.predicate(
    "admin join: token.refreshable_until must be a valid future date-time",
    Number.isFinite(refreshableUntil) && refreshableUntil >= expiredAt,
  );

  // 5. Validate scalar identity fields
  TestValidator.equals(
    "admin join: top-level email matches requested email",
    output.email,
    email,
  );

  // created_at and updated_at are already validated as date-time by typia,
  // but we additionally ensure temporal ordering.
  const createdAtMs: number = new Date(output.created_at).getTime();
  const updatedAtMs: number = new Date(output.updated_at).getTime();

  TestValidator.predicate(
    "admin join: created_at must be valid date-time",
    Number.isFinite(createdAtMs),
  );
  TestValidator.predicate(
    "admin join: updated_at must be valid date-time and >= created_at",
    Number.isFinite(updatedAtMs) && updatedAtMs >= createdAtMs,
  );

  TestValidator.equals(
    "admin join: deleted_at is null for active admin",
    output.deleted_at,
    null,
  );

  // 6. Validate nested admin summary consistency when present
  if (output.admin !== undefined) {
    const summary: IShoppingMallAdmin.ISummary = output.admin;
    typia.assert<IShoppingMallAdmin.ISummary>(summary);

    TestValidator.equals(
      "admin join: summary.id matches top-level id",
      summary.id,
      output.id,
    );
    TestValidator.equals(
      "admin join: summary.email matches top-level email",
      summary.email,
      output.email,
    );
    TestValidator.equals(
      "admin join: summary.status matches top-level status",
      summary.status,
      output.status,
    );
    TestValidator.equals(
      "admin join: summary.email_verified matches top-level email_verified",
      summary.email_verified,
      output.email_verified,
    );
    TestValidator.equals(
      "admin join: summary.created_at matches top-level created_at",
      summary.created_at,
      output.created_at,
    );
    TestValidator.equals(
      "admin join: summary.updated_at matches top-level updated_at",
      summary.updated_at,
      output.updated_at,
    );

    // summary.deleted_at is optional | null | undefined, but when present it
    // should mirror the top-level deleted_at (which we expect to be null).
    if (summary.deleted_at !== undefined) {
      TestValidator.equals(
        "admin join: summary.deleted_at matches top-level deleted_at",
        summary.deleted_at,
        output.deleted_at,
      );
    }
  }
}
