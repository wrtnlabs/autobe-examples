import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_snapshot_zero_subscriber_context(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: true,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const communitySlug = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.communityPlatform.communities.snapshots.at(
      guestConnection,
      {
        communitySlug,
        snapshotId,
      },
    );
  typia.assert<ICommunityPlatformCommunitySnapshot>(snapshot);
  TestValidator.notEquals(
    "snapshot id differs from parent community id",
    snapshot.id,
    snapshot.community.id,
  );
  if (snapshot.deleted_at !== null) {
    TestValidator.notEquals(
      "deleted snapshot keeps distinct creation and deletion timestamps",
      snapshot.created_at,
      snapshot.deleted_at,
    );
  }
}
