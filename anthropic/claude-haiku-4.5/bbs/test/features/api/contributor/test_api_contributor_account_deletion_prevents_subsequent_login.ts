import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

export async function test_api_contributor_account_deletion_prevents_subsequent_login(
  connection: api.IConnection,
) {
  // Step 1: Create first contributor account for deletion test
  const email1: string = typia.random<string & tags.Format<"email">>();
  const username1: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password1: string = "TestPass123!@";

  const contributor1: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: email1,
        username: username1,
        password: password1,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor1);
  TestValidator.predicate(
    "first account created with active status",
    contributor1.account_status === "active",
  );
  TestValidator.equals(
    "first account email matches",
    contributor1.email,
    email1,
  );

  // Step 2: Delete the first contributor account
  const deleteResult: IDiscussionBoardContributor.IDeleteAccountResult =
    await api.functional.discussionBoard.contributor.profile._delete.erase(
      connection,
      {
        body: {
          password: password1,
        } satisfies IDiscussionBoardContributor.IDeleteAccount,
      },
    );
  typia.assert(deleteResult);
  TestValidator.predicate(
    "account deletion successful",
    deleteResult.success === true,
  );
  TestValidator.predicate(
    "deletion result contains deleted_at timestamp",
    deleteResult.deleted_at !== null && deleteResult.deleted_at !== undefined,
  );

  // Step 3: Verify that attempting to use deleted account credentials fails
  // Since only join and delete endpoints are available, we verify deletion prevents reuse
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "deleted account cannot be re-registered with same email",
    async () => {
      await api.functional.auth.contributor.join(unauthConn, {
        body: {
          email: email1,
          username: username1,
          password: password1,
          href: "https://example.com/register",
          referrer: "https://example.com/home",
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Step 4: Verify new account with different credentials can be created
  const email2: string = typia.random<string & tags.Format<"email">>();
  const username2: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password2: string = "AnotherPass456!@";

  const contributor2: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: email2,
        username: username2,
        password: password2,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor2);
  TestValidator.predicate(
    "new account created successfully with active status",
    contributor2.account_status === "active",
  );
  TestValidator.notEquals(
    "new account has different email from deleted account",
    contributor2.email,
    email1,
  );
}
