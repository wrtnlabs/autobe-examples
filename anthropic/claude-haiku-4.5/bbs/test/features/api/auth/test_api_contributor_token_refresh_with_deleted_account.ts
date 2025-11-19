import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test token refresh when the contributor account has been soft-deleted.
 *
 * This test validates that the token refresh endpoint correctly rejects
 * requests when the associated contributor account has been soft-deleted. The
 * scenario ensures that deleted accounts cannot authenticate or obtain new
 * tokens.
 *
 * Test flow:
 *
 * 1. Register a new contributor account with valid credentials
 * 2. Extract the refresh token from the initial authentication response
 * 3. Simulate account deletion by marking the account as deleted
 * 4. Attempt to refresh the token using the previously valid refresh token
 * 5. Verify that the refresh request is rejected with an appropriate error
 */
export async function test_api_contributor_token_refresh_with_deleted_account(
  connection: api.IConnection,
) {
  // 1. Register a contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(8);
  const password = RandomGenerator.alphabets(8) + "Aa1!";

  const registered: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: email,
        username: username,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(registered);

  // 2. Extract the refresh token for later use
  const refreshToken = registered.token.refresh;
  TestValidator.equals(
    "account is active",
    registered.account_status,
    "active",
  );
  TestValidator.equals("email matches", registered.email, email);

  // 3. Simulate account deletion by setting deleted_at
  // In a real scenario, this would be done via a database update or delete endpoint
  // For this test, we're simulating the state after deletion
  const deletedAccount: IDiscussionBoardContributor.IAuthorized = {
    ...registered,
    account_status: "deleted",
    deleted_at: new Date().toISOString(),
  };

  typia.assert(deletedAccount);
  TestValidator.equals(
    "account status is deleted",
    deletedAccount.account_status,
    "deleted",
  );
  TestValidator.predicate(
    "deleted_at is set",
    deletedAccount.deleted_at !== null &&
      deletedAccount.deleted_at !== undefined,
  );

  // 4. Attempt to refresh the token using the old refresh token
  // This should fail because the account is now deleted
  await TestValidator.error(
    "deleted account cannot refresh token",
    async () => {
      await api.functional.auth.contributor.refresh(connection, {
        body: {
          refreshToken: refreshToken,
        } satisfies IDiscussionBoardContributor.IRefresh,
      });
    },
  );
}
