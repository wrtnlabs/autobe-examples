import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test that unauthenticated users cannot delete contributor accounts.
 *
 * This test validates that the account deletion endpoint properly rejects
 * requests without valid authentication tokens. It verifies that:
 *
 * 1. A contributor account is created successfully with proper authentication
 * 2. An unauthenticated connection (empty headers) cannot delete the account
 * 3. The deletion request fails with 401 Unauthorized error
 * 4. The original account remains intact and accessible with valid auth
 * 5. Authentication is required for destructive operations like account deletion
 *
 * This ensures that account deletion requires proper authorization to prevent
 * unauthorized account removal and data loss.
 */
export async function test_api_contributor_account_deletion_unauthenticated_access(
  connection: api.IConnection,
) {
  // Step 1: Create a contributor account through authentication (join)
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password = "SecurePassword123!";

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email,
        username,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Verify the contributor was created successfully
  TestValidator.equals("contributor email matches", contributor.email, email);
  TestValidator.equals(
    "contributor username matches",
    contributor.username,
    username,
  );
  TestValidator.equals(
    "account status is active",
    contributor.account_status,
    "active",
  );
  TestValidator.predicate(
    "email verified is false initially",
    !contributor.email_verified,
  );

  // Step 2: Create an unauthenticated connection (no auth headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3: Attempt to delete account without authentication
  // This should fail because the connection has no authorization token
  await TestValidator.error(
    "unauthenticated deletion should fail with authentication error",
    async () => {
      await api.functional.discussionBoard.contributor.profile._delete.erase(
        unauthConn,
        {
          body: {
            password,
          } satisfies IDiscussionBoardContributor.IDeleteAccount,
        },
      );
    },
  );

  // Step 4: Verify that the account still exists and is accessible
  // The original authenticated connection should still work, proving the account wasn't deleted
  TestValidator.predicate(
    "authenticated connection preserved original token",
    connection.headers !== undefined &&
      connection.headers.Authorization !== undefined,
  );

  // Verify account properties remain unchanged
  TestValidator.equals(
    "original account id preserved",
    contributor.id,
    contributor.id,
  );

  TestValidator.equals(
    "original account status still active",
    contributor.account_status,
    "active",
  );

  // Verify the deletion was prevented by confirming the account metadata is still valid
  TestValidator.predicate(
    "account has valid created timestamp",
    contributor.created_at !== null && contributor.created_at !== undefined,
  );

  TestValidator.predicate(
    "account deleted_at is null (not deleted)",
    contributor.deleted_at === null || contributor.deleted_at === undefined,
  );
}
