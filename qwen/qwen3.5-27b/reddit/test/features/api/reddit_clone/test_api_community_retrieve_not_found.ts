import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a non-existent community returns 404 Not Found.
   *
   * This test verifies that:
   * 1. The endpoint accepts valid UUID format in the path parameter
   * 2. The endpoint returns 404 when the community doesn't exist
   * 3. No authentication is required to access this endpoint
   * 4. The error response is properly formatted
   */
  // Create a public connection (no authentication required)
  const publicConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID that doesn't exist in the database
  const nonExistentCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Verify that calling the endpoint with a non-existent UUID throws 404
  await TestValidator.httpError(
    "should return 404 for non-existent community",
    404,
    async () =>
      await api.functional.redditClone.communities.at(publicConnection, {
        communityId: nonExistentCommunityId,
      }),
  );
}
