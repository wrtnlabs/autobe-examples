import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_admin_snapshots_create } from "../../../generate/generate_random_community_platform_admin_snapshots_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_snapshot } from "../../../prepare/prepare_random_community_platform_community_snapshot";

export async function test_api_community_snapshot_fails_on_deleted_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Member setup - create and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {});
  typia.assert(memberJoin);
  // 3. Create a community as the member
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 4. Use a random UUID for deleted community (different from created one)
  const deletedCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 5. Prepare snapshot data with realistic values
  const snapshotBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    type: "public",
    status: "active",
    visibility: "public",
    is_nsfw: false,
    is_archived: false,
    is_locked: false,
    member_count: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    subscriber_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    post_count: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    comment_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    owner_member_id: memberJoin.id,
  } satisfies ICommunityPlatformCommunitySnapshot.ICreate;
  // 6. Attempt to create snapshot for deleted community - should fail
  await TestValidator.error(
    "snapshot creation should fail for deleted community",
    async () => {
      await api.functional.communityPlatform.admin.snapshots.create(
        adminConnection,
        {
          communityId: deletedCommunityId,
          body: snapshotBody,
        },
      );
    },
  );
}
