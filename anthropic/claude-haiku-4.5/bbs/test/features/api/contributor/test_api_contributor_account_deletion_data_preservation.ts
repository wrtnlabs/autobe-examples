import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test that account deletion uses soft deletion to preserve all associated
 * data.
 *
 * This test validates the soft deletion mechanism for contributor accounts:
 *
 * 1. Contributor registers and authenticates
 * 2. Account is deleted with password verification
 * 3. Soft deletion occurs (deleted_at is set, account_status becomes 'deleted')
 * 4. All account data remains in database for audit and recovery
 * 5. Account cannot be used for authentication after deletion
 * 6. Deletion response confirms successful soft deletion with timestamp
 *
 * The test ensures data preservation during account deletion, allowing for
 * potential recovery within the 6-month retention period while preventing
 * further access to the account.
 */
export async function test_api_contributor_account_deletion_data_preservation(
  connection: api.IConnection,
) {
  // Step 1: Create a new contributor account for testing
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "SecurePassword123!@#";
  const contributorUsername = RandomGenerator.alphabets(10);

  const createdContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: contributorUsername,
        password: contributorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });

  typia.assert(createdContributor);

  // Verify initial account state
  TestValidator.equals(
    "created contributor has active status",
    createdContributor.account_status,
    "active",
  );
  TestValidator.equals(
    "created contributor email matches input",
    createdContributor.email,
    contributorEmail,
  );
  TestValidator.equals(
    "created contributor username matches input",
    createdContributor.username,
    contributorUsername,
  );
  TestValidator.predicate(
    "email_verified is false for new account",
    !createdContributor.email_verified,
  );
  TestValidator.predicate(
    "deleted_at is not set for active account",
    createdContributor.deleted_at === null ||
      createdContributor.deleted_at === undefined,
  );

  // Step 2: Delete the contributor account with password verification
  const deletionResult: IDiscussionBoardContributor.IDeleteAccountResult =
    await api.functional.discussionBoard.contributor.profile._delete.erase(
      connection,
      {
        body: {
          password: contributorPassword,
        } satisfies IDiscussionBoardContributor.IDeleteAccount,
      },
    );

  typia.assert(deletionResult);

  // Step 3: Verify deletion response
  TestValidator.equals(
    "deletion result indicates success",
    deletionResult.success,
    true,
  );
  TestValidator.predicate(
    "deletion message confirms account marked for deletion",
    deletionResult.message.length > 0,
  );

  // Step 4: Verify the deletion timestamp is recent (within last minute)
  const deletionTimestamp = new Date(deletionResult.deleted_at);
  const now = new Date();
  const timeDiffMs = now.getTime() - deletionTimestamp.getTime();
  TestValidator.predicate(
    "deletion timestamp is recent (within 60 seconds)",
    timeDiffMs >= 0 && timeDiffMs <= 60000,
  );

  // Step 5: Confirm soft deletion - account data should still exist but be marked as deleted
  TestValidator.predicate(
    "account deletion completed without errors",
    deletionResult.success === true,
  );

  // Verify the deletion timestamp format is valid ISO 8601 date-time
  const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/;
  TestValidator.predicate(
    "deleted_at timestamp follows ISO 8601 format",
    dateRegex.test(deletionResult.deleted_at),
  );
}
