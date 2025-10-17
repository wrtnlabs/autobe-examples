import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test the administrator account registration by submitting a unique email and
 * hashed password.
 *
 * This test validates successful creation of the admin account with required
 * properties and issuance of JWT tokens for session management.
 *
 * It also verifies that subsequent attempts to register the same email fail as
 * expected.
 */
export async function test_api_admin_registration_with_unique_email_and_password(
  connection: api.IConnection,
) {
  // 1. Prepare unique email and a simulated password hash.
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(64);

  // 2. Register a new admin user with the unique email.
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. Validate the returned admin info matches input and has required properties.
  TestValidator.equals("admin email matches input", admin.email, email);

  TestValidator.predicate(
    "admin id is a uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin.id,
    ),
  );

  TestValidator.predicate(
    "admin created_at is ISO 8601 date string",
    !isNaN(Date.parse(admin.created_at)),
  );

  TestValidator.predicate(
    "admin updated_at is ISO 8601 date string",
    !isNaN(Date.parse(admin.updated_at)),
  );

  // 4. Validate the authorization token contains properly formatted fields.
  TestValidator.predicate(
    "token access is non-empty string",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  TestValidator.predicate(
    "token refresh is non-empty string",
    typeof admin.token.refresh === "string" && admin.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token expired_at is ISO 8601 date string",
    !isNaN(Date.parse(admin.token.expired_at)),
  );

  TestValidator.predicate(
    "token refreshable_until is ISO 8601 date string",
    !isNaN(Date.parse(admin.token.refreshable_until)),
  );

  // 5. Attempt to register again with the same email, expect an error.
  await TestValidator.error(
    "duplicate admin email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email,
          password_hash: RandomGenerator.alphaNumeric(64),
        } satisfies ITodoListAdmin.ICreate,
      });
    },
  );
}
