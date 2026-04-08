import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a moderator's complete information by their UUID.
 *
 * Validates the moderator retrieval endpoint by calling GET /redditClone/moderators/{moderatorId} with a valid UUID and verifying the complete response structure. Ensures that the response contains all required fields including authentication details, user profile reference, account timestamps, and the nested user profile summary. Verifies that sensitive data like password_hash is excluded from the response.
 *
 * Special attention is given to type validation using typia.assert, which performs complete runtime type checking including UUID format validation, date-time format validation, and nullable field handling.
 *
 * 1. Create a moderator-specific connection from the base connection
 * 2. Generate a random UUID for the moderatorId parameter
 * 3. Call the moderators.at API endpoint with the generated ID
 * 4. Validate the complete response structure using typia.assert
 * 5. Verify business logic: moderator ID matches request, deleted_at is null for active moderators
 */
export async function test_api_moderator_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // 2. Generate random moderator ID
  const moderatorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve moderator information
  const moderator = await api.functional.redditClone.moderators.at(
    moderatorConnection,
    { moderatorId },
  );
  // 4. Validate complete response structure
  typia.assert(moderator);
  // 5. Verify business logic
  TestValidator.equals(
    "moderator ID matches request",
    moderator.id,
    moderatorId,
  );
  TestValidator.predicate(
    "moderator is active (not deleted)",
    moderator.deleted_at === null,
  );
  TestValidator.predicate(
    "user profile exists",
    moderator.userProfile !== null,
  );
  TestValidator.predicate(
    "user profile has valid karma",
    typeof moderator.userProfile.karma === "number",
  );
}
