import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

export async function test_api_community_snapshot_list_after_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Update the community name to trigger snapshot creation
  const newName: string = RandomGenerator.paragraph({ sentences: 1 });
  const updated =
    await api.functional.communityPlatform.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: { name: newName } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updated);
  // 4. Retrieve snapshot history with default pagination
  const snapshotPage =
    await api.functional.communityPlatform.member.communities.snapshots.index(
      memberConnection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current",
    snapshotPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    snapshotPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshotPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has pages",
    snapshotPage.pagination.pages >= 1,
  );
  // 6. Validate snapshot data is present
  TestValidator.predicate(
    "snapshot data not empty",
    snapshotPage.data.length >= 1,
  );
  // 7. Verify the most recent snapshot captures the updated community state
  const snapshot = snapshotPage.data[0];
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot name matches updated name",
    snapshot.name,
    newName,
  );
  TestValidator.equals(
    "snapshot description matches community description",
    snapshot.description,
    community.description,
  );
  TestValidator.equals(
    "snapshot subscriber count matches",
    snapshot.subscriber_count,
    community.subscriberCount,
  );
  TestValidator.predicate(
    "snapshot created_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snapshot.created_at),
  );
}
