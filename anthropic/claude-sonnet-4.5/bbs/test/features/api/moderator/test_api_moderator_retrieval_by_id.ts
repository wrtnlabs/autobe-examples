import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving detailed moderator account information by moderator ID.
 *
 * This test validates the moderator retrieval functionality by:
 *
 * 1. Creating a new moderator account through the join endpoint
 * 2. Extracting the moderator ID from the registration response
 * 3. Retrieving the moderator details using the GET endpoint with the ID
 * 4. Validating that all expected fields are present in the response
 * 5. Confirming data consistency between created and retrieved moderator
 * 6. Verifying that sensitive information is excluded from the response
 *
 * The test ensures proper authentication context is established and that the
 * retrieval endpoint returns complete moderator profile information following
 * the IDiscussionBoardModerator.ISummary schema.
 */
export async function test_api_moderator_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account to retrieve later
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(1);
  const displayName = RandomGenerator.name(2);

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: email,
        password: password,
        username: username,
        display_name: displayName,
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(createdModerator);

  // Step 2: Retrieve the moderator by ID
  const retrievedModerator: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorId: createdModerator.id,
    });

  typia.assert(retrievedModerator);

  // Step 3: Validate response structure and data consistency
  TestValidator.equals(
    "retrieved moderator ID matches created moderator ID",
    retrievedModerator.id,
    createdModerator.id,
  );

  TestValidator.equals(
    "retrieved moderator email matches created moderator email",
    retrievedModerator.email,
    createdModerator.email,
  );

  TestValidator.equals(
    "retrieved moderator username matches created moderator username",
    retrievedModerator.username,
    createdModerator.username,
  );

  TestValidator.equals(
    "retrieved moderator display_name matches created moderator display_name",
    retrievedModerator.display_name,
    createdModerator.display_name,
  );

  TestValidator.equals(
    "retrieved moderator email_verified matches created moderator email_verified",
    retrievedModerator.email_verified,
    createdModerator.email_verified,
  );

  TestValidator.equals(
    "retrieved moderator is_active matches created moderator is_active",
    retrievedModerator.is_active,
    createdModerator.is_active,
  );

  TestValidator.equals(
    "retrieved moderator created_at matches created moderator created_at",
    retrievedModerator.created_at,
    createdModerator.created_at,
  );

  TestValidator.equals(
    "retrieved moderator updated_at matches created moderator updated_at",
    retrievedModerator.updated_at,
    createdModerator.updated_at,
  );
}
