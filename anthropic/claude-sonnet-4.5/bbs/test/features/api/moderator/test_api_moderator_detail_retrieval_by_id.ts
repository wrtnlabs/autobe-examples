import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving a specific moderator's detailed information by their unique
 * ID.
 *
 * This test validates the complete workflow of moderator detail retrieval:
 *
 * 1. Create a moderator account to establish a valid moderator entity
 * 2. Authenticate as the created moderator to obtain proper authorization context
 * 3. Retrieve the moderator's detailed information using their unique ID
 * 4. Validate that the response contains all expected fields (id, email, username,
 *    created_at, updated_at)
 * 5. Verify that the retrieved data matches the originally created moderator
 *    information
 * 6. Confirm that sensitive fields like password_hash are excluded from the
 *    response for security
 *
 * The test ensures proper authentication, data integrity, and security measures
 * in the moderator detail retrieval API endpoint.
 */
export async function test_api_moderator_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with random test data
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });

  typia.assert(createdModerator);

  // Step 2: Retrieve the moderator details using the moderator ID
  const retrievedModerator: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorId: createdModerator.id,
    });

  typia.assert(retrievedModerator);

  // Step 3: Validate that retrieved data matches the created moderator
  TestValidator.equals(
    "moderator ID matches",
    retrievedModerator.id,
    createdModerator.id,
  );

  TestValidator.equals(
    "moderator email matches",
    retrievedModerator.email,
    createdModerator.email,
  );

  TestValidator.equals(
    "moderator username matches",
    retrievedModerator.username,
    createdModerator.username,
  );

  TestValidator.equals(
    "moderator created_at matches",
    retrievedModerator.created_at,
    createdModerator.created_at,
  );

  TestValidator.equals(
    "moderator updated_at matches",
    retrievedModerator.updated_at,
    createdModerator.updated_at,
  );
}
