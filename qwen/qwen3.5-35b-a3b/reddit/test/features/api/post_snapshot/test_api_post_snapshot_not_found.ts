import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const testConnection: api.IConnection = { host: connection.host };
  // Case 1: Attempt to retrieve a snapshot with non-existent snapshotId
  // (even with valid postId format, it should return 404)
  const validPostId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for non-existent snapshot",
    404,
    async () =>
      await api.functional.redditPlatform.posts._snapshots.at(testConnection, {
        postId: validPostId,
        snapshotId: nonExistentSnapshotId,
      }),
  );
  // Case 2: Attempt to retrieve snapshot with valid postId but WRONG snapshotId
  // This tests the link validation: WHERE id = snapshotId AND reddit_platform_post_id = postId
  const anotherPostId = typia.random<string & tags.Format<"uuid">>();
  const anotherSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for snapshot not belonging to post",
    404,
    async () =>
      await api.functional.redditPlatform.posts._snapshots.at(testConnection, {
        postId: anotherPostId,
        snapshotId: anotherSnapshotId,
      }),
  );
}
