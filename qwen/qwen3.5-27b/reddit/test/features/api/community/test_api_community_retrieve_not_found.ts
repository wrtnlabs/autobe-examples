import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a community that does not exist in the system.
 *
 * Validates that the community retrieval endpoint properly handles requests for non-existent communities by returning appropriate error responses. The test ensures that when a user attempts to access a community with an invalid or non-existent UUID, the system returns a 404 Not Found error instead of crashing or returning invalid data.
 *
 * This test verifies error handling for edge cases where community identifiers are invalid, ensuring robust API behavior and proper client error responses.
 *
 * 1. Generate a random UUID that does not correspond to any existing community
 * 2. Attempt to retrieve the community using the invalid ID
 * 3. Verify that the API throws an HttpError with status code 404
 * 4. Confirm that the error handling is graceful and the system remains stable
 */
export async function test_api_community_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a random UUID that doesn't exist
  const nonExistentCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Attempt to retrieve the non-existent community
  // 3. Verify that it throws a 404 HttpError
  await TestValidator.httpError(
    "should return 404 for non-existent community",
    404,
    async () =>
      await api.functional.redditClone.communities.at(connection, {
        communityId: nonExistentCommunityId,
      }),
  );
}
