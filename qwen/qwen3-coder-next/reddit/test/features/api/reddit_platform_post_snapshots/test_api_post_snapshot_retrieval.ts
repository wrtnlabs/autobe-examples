import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test post snapshot retrieval functionality.
 * Retrieves a single snapshot summary for a post using the available API.
 * Validates that the snapshot structure matches ISummary type.
 *
 * Note: The API returns a single snapshot summary, not an array of snapshots.
 * The scenario was rewritten to match available API capabilities.
 */
export async function test_api_post_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for post ID testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve a single snapshot for the post
  const snapshot = await api.functional.redditPlatform.posts.snapshots.index(
    connection,
    {
      postId: postId,
    },
  );
  // Validate the snapshot structure using the available DTO type
  typia.assert<IRedditPlatformPostSnapshot.ISummary>(snapshot);
  // Verify snapshot has required properties by checking key structure
  TestValidator.predicate(
    "snapshot exists",
    snapshot !== null && snapshot !== undefined,
  );
}
