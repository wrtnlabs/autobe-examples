import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate valid UUIDs for postId and invalid snapshotId
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const invalidSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Create actor-specific connections (no authentication needed for snapshots)
  const adminConnection: api.IConnection = { host: connection.host };
  // 3. Call the snapshot endpoint with invalid snapshotId
  // Expected: 404 Not Found - snapshot does not exist
  await TestValidator.httpError(
    "should return 404 for non-existent snapshot",
    [404],
    async () => {
      await api.functional.redditCommunity.posts.snapshots.at(adminConnection, {
        postId,
        snapshotId: invalidSnapshotId,
      });
    },
  );
}
