import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community feed behavior when the community has no posts (empty state).
 *
 * Validates that the community feed endpoint handles empty communities gracefully by returning a successful response with an empty data array and appropriate pagination metadata. This test ensures the endpoint is accessible to guests and properly handles the edge case of communities with no content.
 *
 * 1. Create a guest connection (no authentication required for community feed access).
 * 2. Generate a valid UUID for a community that has no posts.
 * 3. Call the community feed endpoint with the empty community ID.
 * 4. Validate the response structure and empty state metadata.
 */
export async function test_api_community_feed_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create guest connection (no authentication needed)
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Generate a community ID (representing an empty community)
  const emptyCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call community feed endpoint with empty community
  const response: IPageIRedditClonePost.ISummary =
    await api.functional.redditClone.communities.feeds.index(guestConnection, {
      communityId: emptyCommunityId,
      body: {} satisfies IRedditClonePost.IRequest,
    });
  // 4. Validate response structure
  typia.assert(response);
  // 5. Validate empty state
  TestValidator.equals("data array is empty", response.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", response.pagination.pages, 0);
  TestValidator.predicate(
    "current page is at least 0",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is at least 0",
    response.pagination.limit >= 0,
  );
}
