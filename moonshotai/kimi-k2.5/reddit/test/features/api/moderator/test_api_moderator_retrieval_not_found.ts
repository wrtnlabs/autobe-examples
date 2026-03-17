import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a non-existent moderator record.
 *
 * This test validates that the API returns a 404 Not Found error when attempting
 * to retrieve a moderator record with a UUID that does not exist in the database.
 * The endpoint should return an appropriate error response indicating the
 * moderator resource was not found.
 */
export async function test_api_moderator_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't correspond to any moderator in the database
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent moderator and expect a 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent moderator",
    404,
    async () => {
      await api.functional.redditLike.moderators.at(connection, {
        moderatorId: nonExistentModeratorId,
      });
    },
  );
}
