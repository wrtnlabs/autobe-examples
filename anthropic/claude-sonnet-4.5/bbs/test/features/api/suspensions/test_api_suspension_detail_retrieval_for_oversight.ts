import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";

/**
 * Test the complete workflow for retrieving detailed suspension information by
 * ID.
 *
 * This test validates that moderators can access comprehensive suspension
 * details necessary for oversight, appeals processing, and moderation quality
 * assurance. The test creates the required prerequisites (moderator account and
 * suspension record) and then verifies that the suspension detail endpoint
 * returns complete information including all metadata, timing details, and
 * relational context.
 *
 * Workflow:
 *
 * 1. Authenticate as a moderator to obtain JWT tokens
 * 2. Create a suspension record to generate a valid suspensionId
 * 3. Retrieve the suspension by its unique ID
 * 4. Validate all suspension details are present and accurate
 */
export async function test_api_suspension_detail_retrieval_for_oversight(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    appointed_by_admin_id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Create a suspension record
  const suspensionData = {
    member_id: typia.random<string & tags.Format<"uuid">>(),
    suspension_reason: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    duration_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
    >(),
  } satisfies IDiscussionBoardSuspension.ICreate;

  const createdSuspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.moderator.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(createdSuspension);

  // Step 3: Retrieve the suspension by its ID
  const retrievedSuspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.moderator.suspensions.at(connection, {
      suspensionId: createdSuspension.id,
    });
  typia.assert(retrievedSuspension);

  // Step 4: Validate that retrieved suspension matches created suspension
  TestValidator.equals(
    "retrieved suspension ID matches created suspension",
    retrievedSuspension.id,
    createdSuspension.id,
  );

  TestValidator.equals(
    "retrieved member_id matches created suspension",
    retrievedSuspension.member_id,
    createdSuspension.member_id,
  );

  TestValidator.equals(
    "retrieved suspension_reason matches input",
    retrievedSuspension.suspension_reason,
    createdSuspension.suspension_reason,
  );

  TestValidator.equals(
    "retrieved duration_days matches input",
    retrievedSuspension.duration_days,
    createdSuspension.duration_days,
  );

  TestValidator.equals(
    "retrieved is_active status matches created suspension",
    retrievedSuspension.is_active,
    createdSuspension.is_active,
  );

  TestValidator.equals(
    "retrieved lifted_early status matches created suspension",
    retrievedSuspension.lifted_early,
    createdSuspension.lifted_early,
  );

  // Validate business logic - new suspensions should be active and not lifted early
  TestValidator.predicate(
    "newly created suspension is active",
    retrievedSuspension.is_active === true,
  );

  TestValidator.predicate(
    "newly created suspension is not lifted early",
    retrievedSuspension.lifted_early === false,
  );

  // Validate that moderation_action_id is present
  TestValidator.predicate(
    "moderation_action_id is present",
    retrievedSuspension.moderation_action_id.length > 0,
  );

  // Validate timing fields exist and are properly formatted
  TestValidator.predicate(
    "start_date is a valid date-time string",
    retrievedSuspension.start_date.length > 0,
  );

  TestValidator.predicate(
    "end_date is a valid date-time string",
    retrievedSuspension.end_date.length > 0,
  );

  TestValidator.predicate(
    "created_at timestamp is present",
    retrievedSuspension.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp is present",
    retrievedSuspension.updated_at.length > 0,
  );
}
