import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

export async function test_api_admin_registration_email_normalization(
  connection: api.IConnection,
) {
  // Generate base email address in lowercase
  const baseEmail = `testadmin${typia.random<number & tags.Type<"uint32"> & tags.Maximum<999999>>()}@example.com`;
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<20>
  >();

  // Create different casing variations of the same email
  const emailVariations = [
    baseEmail.toUpperCase(), // TESTADMIN123@EXAMPLE.COM
    baseEmail
      .split("")
      .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c))
      .join(""), // tEsTaDmIn123@eXaMpLe.CoM
    baseEmail.charAt(0).toUpperCase() + baseEmail.slice(1), // Testadmin123@example.com
  ];

  // Register first admin with uppercase email
  const firstRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      email: emailVariations[0],
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(firstRegistration);

  // Verify email is normalized to lowercase in response
  TestValidator.equals(
    "first registration email should be normalized to lowercase",
    firstRegistration.email,
    baseEmail,
  );

  // Attempt to register with same email but different casing (mixed case)
  await TestValidator.error(
    "second registration with mixed case email should fail as duplicate",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: emailVariations[1],
          password: typia.random<string & tags.MinLength<8>>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string>(),
        } satisfies ITodoListAdmin.ICreate,
      });
    },
  );

  // Attempt to register with same email but different casing (capitalized)
  await TestValidator.error(
    "third registration with capitalized email should fail as duplicate",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: emailVariations[2],
          password: typia.random<string & tags.MinLength<8>>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string>(),
        } satisfies ITodoListAdmin.ICreate,
      });
    },
  );

  // Generate completely different email with mixed casing to verify normalization works for new accounts
  const differentBaseEmail = `anotheradmin${typia.random<number & tags.Type<"uint32"> & tags.Maximum<999999>>()}@example.com`;
  const mixedCaseEmail = differentBaseEmail
    .split("")
    .map((c, i) => (i % 3 === 0 ? c.toUpperCase() : c))
    .join("");

  const secondAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: mixedCaseEmail,
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<20>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(secondAdmin);

  // Verify second admin email is also normalized to lowercase
  TestValidator.equals(
    "second admin email should be normalized to lowercase",
    secondAdmin.email,
    differentBaseEmail,
  );
}
