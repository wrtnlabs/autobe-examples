import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_contributor_profile_update_both_email_and_username(
  connection: api.IConnection,
) {
  // Step 1: Register a contributor account
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const joinResponse: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: initialEmail,
        username: initialUsername,
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Prepare new email and username for atomic update
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  // Step 3: Update both email and username atomically
  const updateResponse: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.update(
      connection,
      {
        body: {
          email: newEmail,
          username: newUsername,
        } satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(updateResponse);

  // Step 4: Validate both fields were updated
  TestValidator.equals("email was updated", updateResponse.email, newEmail);
  TestValidator.equals(
    "username was updated",
    updateResponse.username,
    newUsername,
  );

  // Step 5: Verify other fields remain intact
  TestValidator.equals(
    "user ID remains same",
    updateResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "email verified status",
    updateResponse.emailVerified,
    joinResponse.email_verified,
  );
  TestValidator.equals(
    "account status remains active",
    updateResponse.accountStatus,
    joinResponse.account_status,
  );

  // Step 6: Verify timestamps were updated
  TestValidator.predicate(
    "updated_at timestamp reflects the modification",
    new Date(updateResponse.updatedAt) >= new Date(joinResponse.updated_at),
  );

  // Step 7: Test that update fails with duplicate email
  const anotherContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(anotherContributor);

  // Attempt to update to another contributor's email should fail
  await TestValidator.error(
    "duplicate email should fail validation",
    async () => {
      await api.functional.discussionBoard.contributor.profile.update(
        connection,
        {
          body: {
            email: anotherContributor.email,
            username: "unique_username_xyz",
          } satisfies IDiscussionBoardUser.IUpdate,
        },
      );
    },
  );
}
