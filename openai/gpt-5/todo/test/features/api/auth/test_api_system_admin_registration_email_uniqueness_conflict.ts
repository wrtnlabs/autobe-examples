import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";

/**
 * Validate email uniqueness (case-insensitive) and normalization on system
 * admin registration.
 *
 * Steps:
 *
 * 1. Register a new system admin using a unique, fully lowercased email.
 *
 *    - Expect success, and verify returned email is normalized to lowercase and
 *         equals the submitted email.
 * 2. Attempt to register again with the same logical email but different casing
 *    (upper/mixed case in local and domain).
 *
 *    - Expect a business error due to unique email constraint (case-insensitive).
 * 3. Do not assert specific HTTP status codes or error messages; only that an
 *    error occurs.
 * 4. Do not touch connection headers; SDK manages tokens internally.
 */
export async function test_api_system_admin_registration_email_uniqueness_conflict(
  connection: api.IConnection,
) {
  // Prepare a unique, lowercase email address
  const local = `dup_${RandomGenerator.alphabets(8)}`; // lowercase letters
  const emailLower = `${local}@example.com`;

  // First registration should succeed
  const first = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: emailLower,
      password: `P@ssw0rd!${RandomGenerator.alphaNumeric(6)}`,
    } satisfies ITodoListSystemAdmin.ICreate,
  });
  typia.assert(first);

  // Email should be normalized to lowercase by server policy
  TestValidator.equals(
    "returned email must equal submitted lowercase email",
    first.email,
    emailLower,
  );

  // Compose the same logical email with different casing
  const localCased = local
    .split("")
    .map((ch, i) => (i % 2 === 0 ? ch.toUpperCase() : ch))
    .join("");
  const emailCased = `${localCased}@Example.Com`;

  // Duplicate registration with different casing must fail (conflict by policy)
  await TestValidator.error(
    "duplicate admin registration with case-variant email must fail",
    async () => {
      await api.functional.auth.systemAdmin.join(connection, {
        body: {
          email: emailCased,
          password: `An0ther!${RandomGenerator.alphaNumeric(6)}`,
        } satisfies ITodoListSystemAdmin.ICreate,
      });
    },
  );
}
