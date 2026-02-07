import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_snapshot_historical_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const actorConnection: api.IConnection = {
    host: connection.host,
  };
  const output: ICommunityPlatformPostSnapshot =
    await api.functional.communityPlatform.posts.snapshots.at(actorConnection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      snapshotId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
