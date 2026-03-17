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

export async function test_api_community_snapshot_admin_only_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      nickname: RandomGenerator.name(1),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberJoin);
  // 2. Create community as member
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Attempt snapshot creation as member (should fail)
  await TestValidator.error("member cannot create snapshot", async () => {
    await api.functional.communityPlatform.admin.snapshots.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          code: `snapshot-${RandomGenerator.alphaNumeric(6)}`,
          name: community.name,
          description: community.description,
          type: "public",
          status: "active",
          visibility: "public",
          is_nsfw: false,
          is_archived: false,
          is_locked: false,
          member_count: 0,
          subscriber_count: 0,
          post_count: 0,
          comment_count: 0,
          owner_member_id: community.owner.id,
        } satisfies ICommunityPlatformCommunitySnapshot.ICreate,
      },
    );
  });
  // 4. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 5. Create snapshot as admin (should succeed)
  const snapshot =
    await generate_random_community_platform_admin_snapshots_create(
      adminConnection,
      {
        body: {
          code: `snapshot-${RandomGenerator.alphaNumeric(6)}`,
          name: community.name,
          description: community.description,
          type: "public",
          status: "active",
          visibility: "public",
          is_nsfw: false,
          is_archived: false,
          is_locked: false,
          member_count: 0,
          subscriber_count: 0,
          post_count: 0,
          comment_count: 0,
          owner_member_id: community.owner.id,
        } satisfies ICommunityPlatformCommunitySnapshot.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot properties
  TestValidator.equals(
    "snapshot community matches",
    snapshot.community.id,
    community.id,
  );
  TestValidator.equals("snapshot name matches", snapshot.name, community.name);
  TestValidator.equals(
    "snapshot description matches",
    snapshot.description,
    community.description,
  );
  TestValidator.equals(
    "snapshot owner matches",
    snapshot.owner.id,
    community.owner.id,
  );
  TestValidator.predicate("snapshot has valid code", snapshot.code.length > 0);
  TestValidator.predicate(
    "snapshot has valid created_at",
    new Date(snapshot.created_at).getTime() > 0,
  );
}
