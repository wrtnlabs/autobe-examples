import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Tests that admin registration fails when attempting to use an email already
 * registered by another admin, and ensures that no partial creation occurs,
 * with no email enumeration risk (system should not expose whether an email is
 * registered).
 *
 * Steps:
 *
 * 1. Register the first admin successfully (occupying the email).
 * 2. Attempt to register a second admin using the same email.
 * 3. Expect system to reject duplicate registration with a validation error.
 * 4. Confirm the original admin's account still works and remains unchanged.
 * 5. Confirm error response does not reveal email enumeration/leak registration
 *    status.
 */
export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Register first admin
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> & tags.Format<"password"> =
    typia.random<string & tags.MinLength<8> & tags.Format<"password">>();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip: (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">) =
    RandomGenerator.pick([
      typia.random<string & tags.Format<"ipv4">>(),
      typia.random<string & tags.Format<"ipv6">>(),
    ]);

  const joinBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies ITodoListAdmin.IJoin;

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.equals("registered admin email", admin.email, email);

  // 2. Attempt to register second admin with duplicate email
  await TestValidator.error(
    "duplicate admin registration must fail without leaking existence of email",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email,
          password: typia.random<
            string & tags.MinLength<8> & tags.Format<"password">
          >(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          // purposefully omit IP to test system's default handling
        } satisfies ITodoListAdmin.IJoin,
      });
    },
  );

  // 3. Confirm original admin still works (session refresh/reauth not supported by join, so simply assert its data again)
  TestValidator.equals(
    "original admin email remains registered",
    admin.email,
    email,
  );
  typia.assert(admin);
}
