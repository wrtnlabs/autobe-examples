import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * Test: Moderator registration should be rejected when email already exists
 *
 * Business purpose: Ensure that the system enforces global email uniqueness
 * across registered user and moderator-registration flows. Attempting to
 * register a moderator account using an email already in use by an existing
 * registered user must fail with a conflict (duplicate) error and not create
 * additional records.
 *
 * Steps:
 *
 * 1. Create a registered user via POST /auth/registeredUser/join with a unique
 *    email generated for this test.
 * 2. Attempt to create a moderator-capable account via POST /auth/moderator/join
 *    using the same email. Expect the call to fail (TestValidator.error
 *    awaited).
 * 3. Attempt to re-create the registered user with the same email and expect a
 *    failure as well, validating the uniqueness constraint across flows.
 */
export async function test_api_moderator_registration_duplicate_email_conflict(
  connection: api.IConnection,
) {
  // 1) Setup: create an initial registered user with a unique email
  const uniqueLocalPart = RandomGenerator.alphaNumeric(8).toLowerCase();
  const testEmail = `${uniqueLocalPart}@example.com`;
  const registeredUsername = RandomGenerator.name(1)
    .replace(/\s+/g, "")
    .toLowerCase();

  const registeredBody = {
    username: registeredUsername,
    email: testEmail,
    password: "P@ssw0rd-!" + RandomGenerator.alphaNumeric(4),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: registeredBody,
    });
  // Validate response shape
  typia.assert(registered);

  // 2) Exercise: Try to register a moderator with the SAME email -> expect error
  await TestValidator.error(
    "moderator registration with duplicate email should fail",
    async () => {
      const moderatorBody = {
        username: registeredUsername + "_mod",
        email: testEmail, // intentionally the same
        password: "P@ssw0rd-!" + RandomGenerator.alphaNumeric(4),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumModerator.ICreate;

      await api.functional.auth.moderator.join(connection, {
        body: moderatorBody,
      });
    },
  );

  // 3) Verification: attempt to re-create registered user with same email -> also fail
  await TestValidator.error(
    "re-registering the same email as registered user should fail",
    async () => {
      const secondRegisteredBody = {
        username: registeredUsername + "2",
        email: testEmail,
        password: "P@ssw0rd-!" + RandomGenerator.alphaNumeric(4),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin;

      await api.functional.auth.registeredUser.join(connection, {
        body: secondRegisteredBody,
      });
    },
  );

  // Note: Cleanup is delegated to the test runner (DB reset between tests or
  // isolated test schema). This test does not modify connection.headers or any
  // global state.
}
