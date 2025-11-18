import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate successful and duplicate case for admin registration.
 *
 * 1. Register an admin with a randomly generated unique email and a compliant
 *    password (>=8 chars).
 * 2. Assert the returned object is a valid ITodoListAdmin.IAuthorized and validate
 *    presence of UUID, email, lock status (locked: false), role, timestamps
 *    (created_at, updated_at), deleted_at (null or undefined), and proper token
 *    structure (access, refresh, expired_at, refreshable_until).
 * 3. Ensure password is never present in the response. (No property, not null, not
 *    empty string)
 * 4. Attempt to register another admin with the same email and a valid password
 *    and assert a business logic rejection (i.e., error thrown due to duplicate
 *    email). Never test using wrong types -- all requests use valid DTOs
 *    strictly.
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Register admin successfully with a unique email
  const email = typia.random<string & tags.Format<"email">>();
  const firstPassword = RandomGenerator.alphaNumeric(14);
  const adminReq = {
    email,
    password: firstPassword,
  } satisfies ITodoListAdmin.IJoin;
  const registered = await api.functional.auth.admin.join(connection, {
    body: adminReq,
  });
  typia.assert(registered);
  // Step 2: Business field and relationship validation
  TestValidator.equals("email must match input", registered.email, email);
  TestValidator.equals(
    "account should not be locked after registration",
    registered.locked,
    false,
  );
  TestValidator.equals(
    "deleted_at should be null or undefined immediately after registration",
    registered.deleted_at,
    null,
  );
  TestValidator.predicate(
    "password must not be present in registration response",
    !("password" in registered),
  );
  // Step 3: Re-register with same email and expect validation error: duplicate email not allowed
  await TestValidator.error(
    "admin registration fails for duplicate email",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies ITodoListAdmin.IJoin,
      });
    },
  );
}
