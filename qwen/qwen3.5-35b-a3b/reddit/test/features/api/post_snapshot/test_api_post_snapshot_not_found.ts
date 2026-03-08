import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for the request
  // Note: Snapshot retrieval is a public endpoint (no authorization required)
  // but we follow the connection isolation pattern for consistency
  const snapshotConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID format that doesn't exist in the database
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent snapshot
  // This should throw an HttpError with 404 status code
  await TestValidator.error("non-existent snapshot returns 404", async () => {
    const snapshot = await api.functional.redditPlatform.post_snapshots.at(
      snapshotConnection,
      {
        snapshotId: nonExistentSnapshotId,
      },
    );
    return snapshot;
  });
}
