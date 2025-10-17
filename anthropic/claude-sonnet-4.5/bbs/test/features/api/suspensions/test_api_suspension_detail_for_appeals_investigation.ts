import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";

/**
 * Test retrieving suspension details for appeals investigation workflow.
 *
 * This test validates that moderators can access complete suspension metadata
 * necessary for evaluating early lift requests and making informed decisions on
 * member appeals. The test ensures all fields required for appeals evaluation
 * are present and accurate.
 *
 * Workflow:
 *
 * 1. Register and authenticate as a moderator
 * 2. Create a suspension record with comprehensive details
 * 3. Retrieve the suspension details by ID
 * 4. Validate complete suspension metadata for appeals processing
 */
export async function test_api_suspension_detail_for_appeals_investigation(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const moderatorData = {
    appointed_by_admin_id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a suspension record with comprehensive details
  const suspensionData = {
    member_id: typia.random<string & tags.Format<"uuid">>(),
    suspension_reason: RandomGenerator.paragraph({
      sentences: 10,
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

  // Step 3: Retrieve the suspension details by ID for appeals review
  const retrievedSuspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.moderator.suspensions.at(connection, {
      suspensionId: createdSuspension.id,
    });
  typia.assert(retrievedSuspension);

  // Step 4: Validate that all fields necessary for appeals evaluation are present
  TestValidator.equals(
    "suspension ID matches",
    retrievedSuspension.id,
    createdSuspension.id,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedSuspension.member_id,
    suspensionData.member_id,
  );
  TestValidator.equals(
    "suspension reason matches",
    retrievedSuspension.suspension_reason,
    suspensionData.suspension_reason,
  );
  TestValidator.equals(
    "duration days matches",
    retrievedSuspension.duration_days,
    suspensionData.duration_days,
  );

  // Validate suspension is active for appeals context
  TestValidator.predicate(
    "suspension is currently active",
    retrievedSuspension.is_active,
  );
  TestValidator.predicate(
    "suspension not lifted early",
    retrievedSuspension.lifted_early === false,
  );

  // Validate audit trail timestamps are present
  TestValidator.predicate(
    "created_at timestamp exists",
    typeof retrievedSuspension.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    typeof retrievedSuspension.updated_at === "string",
  );
  TestValidator.predicate(
    "start_date is defined",
    typeof retrievedSuspension.start_date === "string",
  );
  TestValidator.predicate(
    "end_date is defined",
    typeof retrievedSuspension.end_date === "string",
  );

  // Validate moderation action reference for violation context
  TestValidator.predicate(
    "moderation action ID exists",
    typeof retrievedSuspension.moderation_action_id === "string",
  );

  // Validate early lift fields are properly initialized
  if (retrievedSuspension.lifted_early === false) {
    TestValidator.predicate(
      "lifted_at is undefined when not lifted",
      retrievedSuspension.lifted_at === undefined,
    );
    TestValidator.predicate(
      "lifted_reason is undefined when not lifted",
      retrievedSuspension.lifted_reason === undefined,
    );
  }
}
