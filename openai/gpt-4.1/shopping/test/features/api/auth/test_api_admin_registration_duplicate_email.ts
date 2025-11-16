import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin registration with a duplicate email address.
 *
 * Test workflow:
 *
 * 1. Register the first admin using a unique random email, valid password, and
 *    name.
 * 2. Assert that registration succeeds, and validate all fields in the response.
 * 3. Attempt a second registration using the same email but with a different
 *    password and name.
 * 4. Assert that the second registration fails with a duplicate email error
 *    (business error, not type error), and ensure no authentication tokens or
 *    admin account is created.
 */
export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Register the first admin with random email.
  const email = typia.random<string & tags.Format<"email">>();
  const firstAdminInput = {
    email,
    password: RandomGenerator.alphaNumeric(12) + "Aa$",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const firstAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: firstAdminInput });
  typia.assert(firstAdmin);
  TestValidator.equals(
    "email in response matches input",
    firstAdmin.email,
    email,
  );
  TestValidator.predicate(
    "admin token is issued",
    typeof firstAdmin.token.access === "string" &&
      firstAdmin.token.access.length > 0,
  );

  // 2. Attempt to register with the same email but a different password and name.
  const secondAdminInput = {
    email,
    password: RandomGenerator.alphaNumeric(16) + "Bb!",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  await TestValidator.error(
    "should fail to register with duplicate email",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: secondAdminInput,
      });
    },
  );
}
