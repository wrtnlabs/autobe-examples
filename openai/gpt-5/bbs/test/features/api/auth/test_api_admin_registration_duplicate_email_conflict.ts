import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Admin registration success and duplicate email conflict behavior.
 *
 * Validates that a new administrator can register successfully with required
 * credentials and optional preferences, receives an authorization payload with
 * tokens and admin role context, and that attempting to register the same email
 * again results in an error.
 *
 * Steps
 *
 * 1. Prepare registration input (unique email, strong password, display name,
 *    timezone, locale)
 * 2. POST /auth/admin/join — expect IEconDiscussAdmin.IAuthorized
 * 3. Business validations
 *
 *    - Token.access and token.refresh are non-empty strings
 *    - Role equals "admin"
 *    - Subject projection present and reflects display name, timezone, locale
 * 4. Repeat POST with same email — expect an error (duplicate email)
 */
export async function test_api_admin_registration_duplicate_email_conflict(
  connection: api.IConnection,
) {
  // 1) Prepare admin registration input
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12);
  const displayNameRaw: string = RandomGenerator.name(1);
  const timezone: string = "Asia/Seoul";
  const locale: string = "en-US";

  const adminBody = {
    email,
    password,
    display_name: displayNameRaw,
    timezone,
    locale,
  } satisfies IEconDiscussAdmin.ICreate;

  // 2) Register admin (happy path)
  const authorized: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 3) Business validations
  TestValidator.predicate(
    "access token should be a non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    authorized.token.refresh.length > 0,
  );
  TestValidator.equals(
    "admin role should be present",
    authorized.role,
    "admin",
  );

  TestValidator.predicate(
    "admin subject projection should exist",
    authorized.admin !== undefined,
  );
  if (authorized.admin !== undefined) {
    // displayName echoes display_name
    TestValidator.equals(
      "displayName should match input display_name",
      authorized.admin.displayName,
      displayNameRaw,
    );
    // timezone and locale should reflect inputs
    TestValidator.equals(
      "timezone should match input",
      authorized.admin.timezone,
      timezone,
    );
    TestValidator.equals(
      "locale should match input",
      authorized.admin.locale,
      locale,
    );
  }

  // 4) Duplicate email attempt — should error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: adminBody,
      });
    },
  );
}
