import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderator retrieval reflects recent profile updates accurately.
 *
 * This test validates that the GET moderator endpoint returns current data
 * after profile modifications, ensuring no cached or stale data is served.
 *
 * Test Flow:
 *
 * 1. Create a moderator account with initial profile data
 * 2. Update display_name and verify immediate retrieval reflects the change
 * 3. Update username and verify retrieval shows updated username
 * 4. Update email and verify retrieval shows new email
 * 5. Verify updated_at timestamp progresses with each update
 * 6. Confirm unchanged fields retain their original values
 */
export async function test_api_moderator_retrieval_after_profile_updates(
  connection: api.IConnection,
) {
  // Step 1: Create initial moderator account
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();
  const initialDisplayName = RandomGenerator.name();
  const password = typia.random<string & tags.MinLength<8>>();

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: initialEmail,
        password: password,
        username: initialUsername,
        display_name: initialDisplayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(createdModerator);

  const moderatorId = createdModerator.id;
  const initialCreatedAt = createdModerator.created_at;
  let previousUpdatedAt = createdModerator.updated_at;

  // Step 2: Update display_name and verify retrieval
  const newDisplayName = RandomGenerator.name();
  const afterDisplayNameUpdate: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: moderatorId,
        body: {
          display_name: newDisplayName,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(afterDisplayNameUpdate);

  // Retrieve immediately after display_name update
  const retrievedAfterDisplayName: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorId: moderatorId,
    });
  typia.assert(retrievedAfterDisplayName);

  // Validate display_name update is reflected
  TestValidator.equals(
    "retrieved display_name matches updated value",
    retrievedAfterDisplayName.display_name,
    newDisplayName,
  );

  // Validate updated_at changed
  TestValidator.predicate(
    "updated_at changed after display_name update",
    retrievedAfterDisplayName.updated_at !== previousUpdatedAt,
  );

  // Validate unchanged fields retained
  TestValidator.equals(
    "email unchanged after display_name update",
    retrievedAfterDisplayName.email,
    initialEmail,
  );
  TestValidator.equals(
    "username unchanged after display_name update",
    retrievedAfterDisplayName.username,
    initialUsername,
  );

  previousUpdatedAt = retrievedAfterDisplayName.updated_at;

  // Step 3: Update username and verify retrieval
  const newUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();
  const afterUsernameUpdate: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: moderatorId,
        body: {
          username: newUsername,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(afterUsernameUpdate);

  // Retrieve immediately after username update
  const retrievedAfterUsername: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorId: moderatorId,
    });
  typia.assert(retrievedAfterUsername);

  // Validate username update is reflected
  TestValidator.equals(
    "retrieved username matches updated value",
    retrievedAfterUsername.username,
    newUsername,
  );

  // Validate updated_at progressed
  TestValidator.predicate(
    "updated_at changed after username update",
    retrievedAfterUsername.updated_at !== previousUpdatedAt,
  );

  // Validate display_name retained from previous update
  TestValidator.equals(
    "display_name retained after username update",
    retrievedAfterUsername.display_name,
    newDisplayName,
  );

  // Validate email still unchanged
  TestValidator.equals(
    "email unchanged after username update",
    retrievedAfterUsername.email,
    initialEmail,
  );

  previousUpdatedAt = retrievedAfterUsername.updated_at;

  // Step 4: Update email and verify retrieval
  const newEmail = typia.random<string & tags.Format<"email">>();
  const afterEmailUpdate: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorId: moderatorId,
        body: {
          email: newEmail,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(afterEmailUpdate);

  // Retrieve immediately after email update
  const retrievedAfterEmail: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorId: moderatorId,
    });
  typia.assert(retrievedAfterEmail);

  // Validate email update is reflected
  TestValidator.equals(
    "retrieved email matches updated value",
    retrievedAfterEmail.email,
    newEmail,
  );

  // Validate updated_at progressed again
  TestValidator.predicate(
    "updated_at changed after email update",
    retrievedAfterEmail.updated_at !== previousUpdatedAt,
  );

  // Validate username and display_name retained
  TestValidator.equals(
    "username retained after email update",
    retrievedAfterEmail.username,
    newUsername,
  );
  TestValidator.equals(
    "display_name retained after email update",
    retrievedAfterEmail.display_name,
    newDisplayName,
  );

  // Validate created_at never changed
  TestValidator.equals(
    "created_at remains unchanged throughout updates",
    retrievedAfterEmail.created_at,
    initialCreatedAt,
  );

  // Validate email_verified was reset after email change
  TestValidator.equals(
    "email_verified reset to false after email update",
    retrievedAfterEmail.email_verified,
    false,
  );
}
