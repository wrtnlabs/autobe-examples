import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that an admin user can join with an explicit display_name and that
 * the value is propagated into the authorized context payload along with a
 * properly formed token bundle.
 *
 * Steps:
 *
 * 1. Build a unique IJoin payload including email, password, and a human-friendly
 *    display_name.
 * 2. Call POST /auth/adminUser/join via api.functional.auth.adminUser.join.
 * 3. Assert the response structurally matches ITodoAppAdminUser.IAuthorized using
 *    typia.assert.
 * 4. Validate business rules:
 *
 *    - Email is echoed back as provided.
 *    - Display_name is present and equals the requested value.
 *    - Failed_login_count is initialized to 0.
 *    - Status is a non-empty string representing an active-like account.
 *    - Created_at/updated_at are populated; deleted_at is null/undefined.
 *    - Token bundle (access/refresh/expired_at/refreshable_until) is populated with
 *         non-empty values.
 */
export async function test_api_admin_user_join_with_optional_display_name(
  connection: api.IConnection,
) {
  // 1. Prepare registration payload with explicit display_name
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const displayName = RandomGenerator.name(1);

  const joinBody = {
    email,
    password,
    display_name: displayName,
  } satisfies ITodoAppAdminUser.IJoin;

  // 2. Call join endpoint
  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });

  // 3. Structural assertion
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

  // 4. Business rule validations
  TestValidator.equals(
    "admin email should match the join request",
    authorized.email,
    email,
  );

  TestValidator.equals(
    "display_name should be propagated into authorized context",
    authorized.display_name,
    displayName,
  );

  TestValidator.equals(
    "failed_login_count should be initialized to 0",
    authorized.failed_login_count,
    0,
  );

  TestValidator.predicate(
    "status should be a non-empty string",
    typeof authorized.status === "string" && authorized.status.length > 0,
  );

  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof authorized.created_at === "string" &&
      authorized.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof authorized.updated_at === "string" &&
      authorized.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined for a fresh account",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  // Token bundle validation
  const token: IAuthorizationToken = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at should be a non-empty string",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refreshable_until should be a non-empty string",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );
}
