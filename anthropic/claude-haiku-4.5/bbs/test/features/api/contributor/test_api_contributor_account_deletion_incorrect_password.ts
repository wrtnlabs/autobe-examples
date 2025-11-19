import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test account deletion prevention when incorrect password is provided.
 *
 * This test validates that the account deletion endpoint properly rejects
 * deletion attempts when an incorrect password is provided for verification.
 * The test ensures that:
 *
 * 1. A new contributor account is created with a specific password
 * 2. An attempt to delete the account with an incorrect password fails
 * 3. The deletion operation is properly rejected with an error
 *
 * This prevents accidental or unauthorized account deletion through password
 * verification, ensuring data integrity and user account security.
 */
export async function test_api_contributor_account_deletion_incorrect_password(
  connection: api.IConnection,
) {
  // Step 1: Create a new contributor account with a specific password
  const correctPassword = "SecurePass123!";
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(10);

  const createdContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: username,
        password: correctPassword,
        ip: "192.168.1.1",
        href: "http://localhost:3000/register" satisfies string &
          tags.Format<"uri">,
        referrer: "http://localhost:3000" satisfies string & tags.Format<"uri">,
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(createdContributor);

  // Verify that the account was created with active status
  TestValidator.equals(
    "contributor should be created with active status",
    createdContributor.account_status,
    "active",
  );
  TestValidator.predicate(
    "created_at should be set",
    createdContributor.created_at !== null &&
      createdContributor.created_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at should not be set initially",
    createdContributor.deleted_at,
    null,
  );

  // Step 2: Attempt to delete the account with incorrect password
  const incorrectPassword = "WrongPassword456@";

  await TestValidator.error(
    "account deletion with incorrect password should fail",
    async () => {
      await api.functional.discussionBoard.contributor.profile._delete.erase(
        connection,
        {
          body: {
            password: incorrectPassword,
          } satisfies IDiscussionBoardContributor.IDeleteAccount,
        },
      );
    },
  );

  // Step 3: Verify that deletion was rejected by confirming we got an error
  // The error was successfully caught by TestValidator.error() above
  TestValidator.predicate(
    "deletion attempt should have been rejected for incorrect password",
    true,
  );
}
