import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving community details when the community does not exist.
 *
 * This test generates a random UUID that doesn't correspond to any existing
 * community, calls the GET endpoint with this non-existent ID, and verifies
 * that the system returns a 404 Not Found error response.
 */
export async function test_api_community_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection following isolation pattern
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID that doesn't exist
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Verify 404 is returned for non-existent community
  await TestValidator.httpError(
    "returns 404 for non-existent community",
    404,
    async () => {
      await api.functional.redditLike.communities.at(guestConnection, {
        communityId: nonExistentCommunityId,
      });
    },
  );
}
