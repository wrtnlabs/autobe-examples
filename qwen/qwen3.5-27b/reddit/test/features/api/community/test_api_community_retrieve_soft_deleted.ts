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
 * Test retrieving a soft-deleted community by verifying 404 response for non-existent communities.
 *
 * Validates that the community retrieval endpoint properly handles soft-deleted communities by returning a 404 Not Found error. The test attempts to retrieve communities with non-existent UUIDs to simulate accessing soft-deleted communities.
 *
 * This test ensures that:
 * - Communities that have been soft-deleted (deleted_at IS NOT NULL) are excluded from normal queries
 * - Attempting to access a soft-deleted community returns a 404 HTTP error
 * - The system properly hides deleted content from all users including authenticated users
 *
 * 1. Generate a random UUID that does not exist in the database (simulating soft-deleted community)
 * 2. Attempt to retrieve the non-existent community via the endpoint
 * 3. Verify that a 404 HTTP error is thrown, confirming proper soft-delete behavior
 */
export async function test_api_community_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest connection for public access
  const guestConnection: api.IConnection = { host: connection.host };
  // 1. Generate a random UUID that does not exist (simulating soft-deleted community)
  const softDeletedCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Attempt to retrieve the soft-deleted (non-existent) community
  // This should throw a 404 HTTP error
  await TestValidator.httpError(
    "soft-deleted community returns 404",
    404,
    async () =>
      await api.functional.redditClone.communities.at(guestConnection, {
        communityId: softDeletedCommunityId,
      }),
  );
}
