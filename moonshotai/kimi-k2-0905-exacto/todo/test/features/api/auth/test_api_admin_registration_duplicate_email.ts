import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Tests rejection of new administrator registration attempts using an already
 * registered email address.
 *
 * This test performs the following procedure:
 *
 * 1. Registers a new administrator using a randomly generated email (and valid
 *    credentials).
 * 2. Attempts to register another administrator account using the same email and a
 *    different password but valid session context fields.
 * 3. Expects the first registration to succeed and the API to issue an
 *    authentication token for the new admin.
 * 4. Expects the second registration to fail, verifying that the email uniqueness
 *    constraint is properly enforced at both the schema and business layers.
 * 5. Validates that the API returns a clear error indicating the duplicate email
 *    condition.
 */
export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Generate a unique random admin registration payload
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const registrationBody = {
    email,
    password,
    href: "https://test-case.example.com/admin/join",
    referrer: "https://test-case.example.com/login",
    ip: null,
  } satisfies ITodoListAdmin.IJoin;

  // 2. Register the first admin
  const firstAdmin = await api.functional.auth.admin.join(connection, {
    body: registrationBody,
  });
  typia.assert(firstAdmin);
  TestValidator.equals(
    "first registration email matches",
    firstAdmin.email,
    email,
  );

  // 3. Attempt to register a second admin with the same email but different password/session context
  const duplicateRegistrationBody = {
    email,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://test-case.example.com/admin/register",
    referrer: "https://test-case.example.com/home",
    ip: null,
  } satisfies ITodoListAdmin.IJoin;

  await TestValidator.error(
    "duplicate admin registration with same email should be rejected",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: duplicateRegistrationBody,
      });
    },
  );
}
