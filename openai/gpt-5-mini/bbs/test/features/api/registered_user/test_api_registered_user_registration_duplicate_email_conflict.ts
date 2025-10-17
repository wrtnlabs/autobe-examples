import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registered_user_registration_duplicate_email_conflict(
  connection: api.IConnection,
) {
  /**
   * Validate registration conflict behavior when attempting to register two
   * accounts with the same email address.
   *
   * Steps implemented:
   *
   * 1. Create an initial account via POST /auth/registeredUser/join with a
   *    generated email and username.
   * 2. Attempt to create a second account using the same email but a different
   *    username; assert that the operation fails (business error).
   * 3. Re-assert original creation response remains valid.
   *
   * Notes: Direct DB verification is not implemented because no listing or
   * deletion APIs are provided in the supplied SDK materials. Cleanup is
   * expected to be handled by the test environment (e.g., DB reset between
   * tests).
   */

  // 1) Prepare valid test data
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username = RandomGenerator.alphaNumeric(8);
  const password = "P@ssw0rd#2025"; // valid strong password for test
  const display_name = RandomGenerator.name();

  // 2) Create initial account
  const created: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username,
        email,
        password,
        display_name,
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  // Validate response shape and important business values
  typia.assert(created);
  TestValidator.predicate(
    "created token is present",
    typeof created.token?.access === "string" &&
      created.token.access.length > 0,
  );

  // 3) Attempt duplicate registration with same email but different username
  const otherUsername = RandomGenerator.alphaNumeric(8);
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: otherUsername,
        email, // intentionally the same email
        password: "AnotherP@ss1",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  });

  // 4) Re-assert original account remains intact
  typia.assert(created);
  TestValidator.equals(
    "original username intact",
    created.username ?? null,
    username,
  );

  // 5) Teardown note: No delete API available in the provided SDK. Test
  // environment must cleanup (DB reset) between tests.
}
