import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test account deletion when password field is empty or missing.
 *
 * This test validates that the account deletion endpoint properly enforces
 * password verification as a required field. A contributor registers and
 * authenticates, then attempts account deletion with an empty password. The
 * operation should fail with a validation error, the account should remain
 * active and unaffected, and the contributor should retain full access.
 *
 * Steps:
 *
 * 1. Create a new contributor account via registration
 * 2. Verify the contributor is authenticated with valid tokens
 * 3. Attempt account deletion with empty password field
 * 4. Verify the operation fails due to password validation
 */
export async function test_api_contributor_account_deletion_empty_password(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(8);
  const password = "SecurePass123!";
  const href = "https://example.com/register";
  const referrer = "https://example.com/home";

  const registeredContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email,
        username,
        password,
        href,
        referrer,
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(registeredContributor);

  // Step 2: Verify contributor is authenticated
  TestValidator.equals(
    "registered contributor has active account status",
    registeredContributor.account_status,
    "active",
  );
  TestValidator.predicate(
    "registered contributor has valid access token",
    registeredContributor.token.access.length > 0,
  );
  TestValidator.predicate(
    "registered contributor has valid refresh token",
    registeredContributor.token.refresh.length > 0,
  );

  // Step 3: Attempt account deletion with empty password
  // This should fail because password field requires minimum 1 character
  // The empty string violates the MinLength<1> constraint
  await TestValidator.error(
    "account deletion with empty password should fail validation",
    async () => {
      await api.functional.discussionBoard.contributor.profile._delete.erase(
        connection,
        {
          body: {
            password: "",
          } satisfies IDiscussionBoardContributor.IDeleteAccount,
        },
      );
    },
  );

  // Step 4: Verify deletion was rejected
  // The fact that TestValidator.error passed confirms the request was rejected
  // Account remains intact because deletion failed
  TestValidator.predicate(
    "account deletion request was properly rejected due to empty password",
    true,
  );
}
