import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test error handling when requesting a post snapshot that does not exist.
 *
 * Validates that the post snapshot retrieval endpoint properly returns HTTP 404 Not Found errors when attempting to access snapshots with non-existent IDs. Tests multiple scenarios including completely invalid IDs and mismatched post/snapshot combinations.
 *
 * The endpoint is public and accessible without authentication, so the base connection is used directly. Multiple test cases verify consistent error handling regardless of which ID parameter is invalid.
 *
 * 1. Generate random UUIDs for postId and snapshotId that don't exist in the system
 * 2. Call GET /redditClone/posts/{postId}/snapshots/{snapshotId} with non-existent IDs
 * 3. Verify the response throws HttpError with status code 404
 * 4. Test with different combinations of invalid IDs to ensure consistent error handling
 */
export async function test_api_post_snapshot_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Test case 1: Both postId and snapshotId are non-existent
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "returns 404 when both postId and snapshotId don't exist",
    404,
    async () =>
      await api.functional.redditClone.posts.snapshots.at(connection, {
        postId: nonExistentPostId,
        snapshotId: nonExistentSnapshotId,
      }),
  );
  // Test case 2: Different random UUIDs to ensure it's not a caching issue
  const anotherPostId = typia.random<string & tags.Format<"uuid">>();
  const anotherSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "returns 404 with different non-existent IDs",
    404,
    async () =>
      await api.functional.redditClone.posts.snapshots.at(connection, {
        postId: anotherPostId,
        snapshotId: anotherSnapshotId,
      }),
  );
  // Test case 3: Multiple attempts with fresh random IDs
  const thirdPostId = typia.random<string & tags.Format<"uuid">>();
  const thirdSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "consistently returns 404 for non-existent snapshots",
    404,
    async () =>
      await api.functional.redditClone.posts.snapshots.at(connection, {
        postId: thirdPostId,
        snapshotId: thirdSnapshotId,
      }),
  );
}
