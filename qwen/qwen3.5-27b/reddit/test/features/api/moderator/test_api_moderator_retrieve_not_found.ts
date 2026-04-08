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
 * Test retrieving a moderator that does not exist.
 *
 * Validates that attempting to retrieve a moderator with a non-existent UUID returns the appropriate HTTP 404 Not Found error. This ensures the API correctly handles requests for resources that don't exist in the system.
 *
 * The test generates a random UUID that is guaranteed not to exist in the database and verifies the endpoint responds with a 404 status code rather than throwing an unexpected error or returning invalid data.
 *
 * 1. Generate a random UUID that does not exist in the system
 * 2. Call GET /redditClone/moderators/{moderatorId} with the non-existent UUID
 * 3. Verify the response throws an HttpError with status 404 Not Found
 */
export async function test_api_moderator_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a non-existent moderator ID
  const nonExistentModeratorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Verify the API returns 404 for non-existent moderator
  await TestValidator.httpError(
    "should return 404 for non-existent moderator",
    404,
    async () =>
      await api.functional.redditClone.moderators.at(connection, {
        moderatorId: nonExistentModeratorId,
      }),
  );
}
