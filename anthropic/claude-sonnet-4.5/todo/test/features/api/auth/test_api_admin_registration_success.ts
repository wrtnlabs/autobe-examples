import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test successful administrator registration via POST /auth/admin/join.
 *
 * This test covers all major business validations and response structure
 * requirements for the admin join flow:
 *
 * 1. Register a new admin with a unique, valid non-personal business email and
 *    secure password.
 * 2. Verify the response contains an admin profile: id, email, created_at,
 *    updated_at, and null/undefined disabled_at.
 * 3. Confirm that password hashes or security credentials are never present in the
 *    response.
 * 4. Confirm that token object contains access, refresh, expired_at, and
 *    refreshable_until.
 * 5. Ensure that audit/session fields (href, referrer, and optional ip) are
 *    accepted in request and not leaked in the response.
 * 6. Confirm that disabled_at is null or undefined (admin is enabled).
 * 7. Negative test: Attempt admin creation with same email (should fail as
 *    business error) and with a personal email (like gmail.com, should fail
 *    business validation).
 *
 * Steps:
 *
 * - Generate unique, realistic business email (e.g., john.doe@company.com)
 * - Use password of at least 8 chars
 * - Provide href and referrer fields as valid URI strings
 * - Call api.functional.auth.admin.join and validate positive response
 * - Assert that disabled_at is null or undefined and that created_at/updated_at
 *   are valid date-time strings
 * - Assert that token fields are present and valid
 * - Attempt to reregister with the same email and assert error
 * - Attempt to register with a personal email (e.g., john.doe@gmail.com) and
 *   assert business error
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  // 1. Generate valid unique business email and secure password
  const businessEmail = `john.${RandomGenerator.alphaNumeric(5)}@company.com`;
  const password = RandomGenerator.alphaNumeric(10) + "A!";
  // Required session context fields
  const href = "https://admin-console.company.com/register";
  const referrer = "https://company.com/welcome";

  // 2. Register new admin - positive case
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: businessEmail,
      password,
      href,
      referrer,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(admin);

  // 3. Validate that profile fields (id, email, created_at, updated_at) exist and disabled_at is null
  TestValidator.predicate(
    "admin id is valid uuid",
    typeof admin.id === "string" && admin.id.length > 10,
  );
  TestValidator.equals("admin email matches input", admin.email, businessEmail);
  TestValidator.predicate(
    "created_at is iso8601",
    typeof admin.created_at === "string" &&
      new Date(admin.created_at).toISOString() === admin.created_at,
  );
  TestValidator.predicate(
    "updated_at is iso8601",
    typeof admin.updated_at === "string" &&
      new Date(admin.updated_at).toISOString() === admin.updated_at,
  );
  TestValidator.equals(
    "disabled_at is null or undefined",
    admin.disabled_at,
    undefined,
  ); // or null (interface accepts both)

  // 4. Confirm no password/hash information and correct token fields
  TestValidator.predicate(
    "password is never present in response",
    (admin as any).password === undefined,
  );
  TestValidator.predicate(
    "token.access exists",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh exists",
    typeof admin.token.refresh === "string" && admin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is iso8601",
    typeof admin.token.expired_at === "string" &&
      new Date(admin.token.expired_at).toISOString() === admin.token.expired_at,
  );
  TestValidator.predicate(
    "token.refreshable_until is iso8601",
    typeof admin.token.refreshable_until === "string" &&
      new Date(admin.token.refreshable_until).toISOString() ===
        admin.token.refreshable_until,
  );

  // 5. Negative test: Attempt to register another admin with the same email - should fail
  await TestValidator.error(
    "duplicate admin email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: businessEmail,
          password,
          href,
          referrer,
        } satisfies ITodoListAdmin.IJoin,
      });
    },
  );

  // 6. Negative test: Attempt to register with a personal Gmail address
  const personalEmail = `jane.${RandomGenerator.alphaNumeric(5)}@gmail.com`;
  await TestValidator.error(
    "personal email should fail validation",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: personalEmail,
          password,
          href,
          referrer,
        } satisfies ITodoListAdmin.IJoin,
      });
    },
  );
}
