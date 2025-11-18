import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validate admin email uniqueness on registration.
 *
 * This test ensures that the system enforces a global uniqueness constraint on
 * the admin email field when registering new administrative users. It validates
 * that duplicate admin registrations using the same email are properly rejected
 * and that only unique emails can be registered.
 *
 * 1. Generate a random valid ITodoListAdmin.ICreate payload.
 * 2. Register the admin via api.functional.auth.admin.join and assert success;
 *    verify email and response types.
 * 3. Attempt to register another admin with the same email, using new data for
 *    other fields (ensure unique password, display_name, etc. but identical
 *    email).
 * 4. Assert the second registration fails with an error (TestValidator.error), and
 *    that no IAuthorized is returned.
 * 5. Register a third admin with a different unique email and assert success.
 * 6. This test confirms correct business logic (uniqueness of email) without
 *    testing for type errors.
 */
export async function test_api_admin_registration_email_uniqueness(
  connection: api.IConnection,
) {
  // Generate unique test email for admin registration
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // First registration attempt with a valid random payload
  const firstBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://admin.todoapp.com/register",
    referrer: "https://admin.todoapp.com/login",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListAdmin.ICreate;
  const firstResult: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: firstBody });
  typia.assert(firstResult);
  TestValidator.equals(
    "first admin registration: email matches",
    firstResult.email,
    adminEmail,
  );
  // Second registration attempt with different data but same email (should fail for uniqueness)
  const secondBody = {
    email: adminEmail, // duplicate
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://admin.todoapp.com/register",
    referrer: "https://admin.todoapp.com/login",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListAdmin.ICreate;
  await TestValidator.error(
    "duplicate admin registration with same email must fail",
    async () => {
      await api.functional.auth.admin.join(connection, { body: secondBody });
    },
  );
  // Third registration attempt with a different unique email (should succeed)
  const thirdBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "https://admin.todoapp.com/register",
    referrer: "https://admin.todoapp.com/login",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListAdmin.ICreate;
  const thirdResult: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: thirdBody });
  typia.assert(thirdResult);
  TestValidator.notEquals(
    "new admin registration: different email",
    thirdResult.email,
    adminEmail,
  );
}
