import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test successful contributor account deletion with password verification.
 *
 * This test validates the complete account deletion workflow:
 *
 * 1. Create a new contributor account with email, username, and password
 * 2. Authenticate the contributor and receive JWT tokens
 * 3. Initiate account deletion with correct password verification
 * 4. Verify soft deletion completes successfully with proper response
 * 5. Confirm response contains success indicator, message, and deletion timestamp
 * 6. Verify deletion timestamp is in ISO 8601 format
 * 7. Test that deletion is rejected with incorrect password for security
 */
export async function test_api_contributor_account_deletion_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password = "SecurePass@123";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const createdContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email,
        username,
        password,
        href,
        referrer,
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(createdContributor);

  // Step 2: Verify contributor is created with active status
  TestValidator.equals(
    "contributor account is created with active status",
    createdContributor.account_status,
    "active",
  );
  TestValidator.equals(
    "contributor email matches",
    createdContributor.email,
    email,
  );
  TestValidator.equals(
    "contributor username matches",
    createdContributor.username,
    username,
  );
  TestValidator.predicate(
    "contributor has access token",
    createdContributor.token.access.length > 0,
  );
  TestValidator.predicate(
    "contributor has refresh token",
    createdContributor.token.refresh.length > 0,
  );

  // Step 3: Initiate account deletion with correct password
  const deleteResponse: IDiscussionBoardContributor.IDeleteAccountResult =
    await api.functional.discussionBoard.contributor.profile._delete.erase(
      connection,
      {
        body: {
          password,
        } satisfies IDiscussionBoardContributor.IDeleteAccount,
      },
    );
  typia.assert(deleteResponse);

  // Step 4: Verify deletion response indicates success
  TestValidator.equals("deletion was successful", deleteResponse.success, true);
  TestValidator.predicate(
    "deletion message is present and non-empty",
    deleteResponse.message.length > 0,
  );
  TestValidator.predicate(
    "deleted_at timestamp is present and non-empty",
    deleteResponse.deleted_at.length > 0,
  );

  // Step 5: Verify the deletion timestamp is in ISO 8601 format
  TestValidator.predicate(
    "deleted_at is valid ISO 8601 date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(deleteResponse.deleted_at),
  );

  // Step 6: Verify deletion rejects incorrect password
  await TestValidator.error(
    "account deletion fails with incorrect password for security",
    async () => {
      await api.functional.discussionBoard.contributor.profile._delete.erase(
        connection,
        {
          body: {
            password: "IncorrectPassword@999",
          } satisfies IDiscussionBoardContributor.IDeleteAccount,
        },
      );
    },
  );
}
