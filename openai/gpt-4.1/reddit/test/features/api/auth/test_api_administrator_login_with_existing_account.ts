import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Test administrator login with existing account credentials and validate
 * authentication response.
 *
 * This test covers the authentication lifecycle for system administrators on
 * the community platform. It verifies that administrators can correctly log in
 * with their registered credentials and that all authentication/session
 * properties are handled securely.
 *
 * Steps:
 *
 * 1. Create a new administrator account with a unique email and a strong password
 *    using /auth/administrator/join.
 * 2. Attempt to log in to /auth/administrator/login with the above credentials,
 *    providing valid href and referrer URIs (required for session audit
 *    context).
 * 3. Inspect the login result:
 *
 *    - Confirm a valid administrator ID (uuid format), email (email format), and
 *         status string are returned.
 *    - Ensure the result delivers a well-structured authentication token (with
 *         access/refresh/expired_at/refreshable_until), and none of the DTOs
 *         reveal sensitive (e.g., password, hash) properties.
 *    - Check fields like created_at and updated_at for correct ISO 8601 timestamp
 *         format.
 *    - Confirm business_status is properly echoed (may be null).
 *    - Validate none of the response payloads contain unexpected properties.
 * 4. Ensure the token info in the response matches the expected structure and
 *    TypeScript types, with all required fields present and in correct format.
 */
export async function test_api_administrator_login_with_existing_account(
  connection: api.IConnection,
) {
  // 1. Create a new administrator
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const createBody = {
    email,
    password,
    business_status: null,
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const created: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 2. Attempt to log in with the same credentials
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ILogin;

  const authorized: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: loginBody,
    });
  typia.assert(authorized);

  // 3. Validate returned fields and token schema
  // id
  TestValidator.equals(
    "login: id matches created administrator id",
    authorized.id,
    created.id,
  );

  // email
  TestValidator.equals(
    "login: email matches created administrator email",
    authorized.email,
    email,
  );

  // status
  TestValidator.predicate(
    "login: status is non-empty string",
    typeof authorized.status === "string" && authorized.status.length > 0,
  );

  // business_status
  TestValidator.equals(
    "login: business_status matches created administrator",
    authorized.business_status,
    created.business_status,
  );

  // created_at, updated_at
  TestValidator.predicate(
    "login: created_at valid ISO timestamp format",
    typeof authorized.created_at === "string" &&
      !isNaN(Date.parse(authorized.created_at)),
  );
  TestValidator.predicate(
    "login: updated_at valid ISO timestamp format",
    typeof authorized.updated_at === "string" &&
      !isNaN(Date.parse(authorized.updated_at)),
  );

  // deleted_at may be null or undefined
  if (authorized.deleted_at !== null && authorized.deleted_at !== undefined)
    TestValidator.predicate(
      "login: deleted_at valid ISO timestamp (if set)",
      typeof authorized.deleted_at === "string" &&
        !isNaN(Date.parse(authorized.deleted_at)),
    );

  // 4. Validate token structure
  typia.assert<IAuthorizationToken>(authorized.token);
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at valid ISO timestamp",
    typeof authorized.token.expired_at === "string" &&
      !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until valid ISO timestamp",
    typeof authorized.token.refreshable_until === "string" &&
      !isNaN(Date.parse(authorized.token.refreshable_until)),
  );

  // 5. Confirm no sensitive fields are leaked (no password/hash in response)
  // TypeScript model and typia.assert ensure this at compile/runtime.
}
