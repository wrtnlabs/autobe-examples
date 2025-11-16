import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the accuracy and completeness of moderator data retrieval.
 *
 * This test validates that moderator detail information is returned accurately
 * with all required fields properly formatted and containing correct data.
 *
 * Process:
 *
 * 1. Create a moderator account with specific registration details
 * 2. Authenticate as the moderator (automatic via join response)
 * 3. Retrieve the moderator's detailed information
 * 4. Validate all returned fields for proper format and accuracy
 * 5. Verify timestamp logic (created_at <= updated_at)
 */
export async function test_api_moderator_detail_data_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with specific registration data
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationUsername = RandomGenerator.name();
  const registrationPassword = "TestPassword123!";

  const registrationData = {
    email: registrationEmail,
    password: registrationPassword,
    username: registrationUsername,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 2: Join (register) as moderator - this automatically authenticates
  const authorizedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Validate the authorized response structure
  typia.assert(authorizedModerator);

  // Step 3: Retrieve moderator details using the moderator ID
  const moderatorDetails: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorId: authorizedModerator.id,
    });

  // Step 4: Validate the retrieved moderator details
  typia.assert(moderatorDetails);

  // Step 5: Verify data accuracy between registration and retrieval
  TestValidator.equals(
    "moderator ID should match",
    moderatorDetails.id,
    authorizedModerator.id,
  );

  TestValidator.equals(
    "moderator email should match registration email",
    moderatorDetails.email,
    registrationEmail,
  );

  TestValidator.equals(
    "moderator username should match registration username",
    moderatorDetails.username,
    registrationUsername,
  );

  TestValidator.equals(
    "created_at should match between authorized and detail responses",
    moderatorDetails.created_at,
    authorizedModerator.created_at,
  );

  TestValidator.equals(
    "updated_at should match between authorized and detail responses",
    moderatorDetails.updated_at,
    authorizedModerator.updated_at,
  );

  // Step 6: Validate timestamp logic
  const createdAtTime = new Date(moderatorDetails.created_at).getTime();
  const updatedAtTime = new Date(moderatorDetails.updated_at).getTime();

  TestValidator.predicate(
    "created_at should not be later than updated_at",
    createdAtTime <= updatedAtTime,
  );
}
