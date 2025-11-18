import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test case-insensitive email handling in user profile updates.
 *
 * Validates that email addresses are stored in lowercase and matched
 * case-insensitively. Steps include:
 *
 * 1. Register user with lowercase email
 * 2. Attempt update to same email with different casing (should fail as duplicate)
 * 3. Update to new email in mixed case
 * 4. Verify new email is stored in lowercase
 * 5. Verify retrievability of the updated profile
 */
export async function test_api_user_profile_case_insensitive_email_handling(
  connection: api.IConnection,
) {
  // Step 1: Register a new user with lowercase email
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const lowercaseEmail = originalEmail.toLowerCase();

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: lowercaseEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);
  TestValidator.equals(
    "registered user email stored in lowercase",
    registeredUser.email,
    lowercaseEmail,
  );

  // Step 2: Attempt to update profile to same email with different casing
  // This should fail because emails are case-insensitive duplicates
  const uppercaseEmail = lowercaseEmail.toUpperCase();

  await TestValidator.error(
    "cannot update to same email with different casing",
    async () => {
      await api.functional.todoList.user.auth.user.profile.update(connection, {
        body: {
          email: uppercaseEmail,
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // Step 3: Update profile to a completely new email in mixed case
  const newEmailParts = RandomGenerator.alphaNumeric(8).split("");
  const newEmailMixedCase = newEmailParts.join("") + "@Example.Com";
  const newEmailExpectedLowercase = newEmailMixedCase.toLowerCase();

  const updatedUser: ITodoListUser =
    await api.functional.todoList.user.auth.user.profile.update(connection, {
      body: {
        email: newEmailMixedCase,
      } satisfies ITodoListUser.IUpdate,
    });
  typia.assert(updatedUser);

  // Step 4: Verify that the new email is stored in lowercase
  TestValidator.equals(
    "updated email stored in lowercase format",
    updatedUser.email,
    newEmailExpectedLowercase,
  );

  // Step 5: Verify email was actually changed from original
  TestValidator.notEquals(
    "new email is different from original email",
    updatedUser.email,
    lowercaseEmail,
  );
}
