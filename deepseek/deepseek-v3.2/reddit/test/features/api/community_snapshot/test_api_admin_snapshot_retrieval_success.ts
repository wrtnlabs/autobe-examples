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

export async function test_api_admin_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin credentials first, then authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  // Create admin account using SDK (no utility for join)
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.communityPlatform.auth.admin.join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Now login as admin using utility function
  const adminAuthorized = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(adminAuthorized);
  // 2. Authenticate as member (community creator)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: ArrayUtil.repeat(12, () => RandomGenerator.alphabets(1)).join(
        "",
      ),
      nickname: ArrayUtil.repeat(2, () => RandomGenerator.alphabets(5)).join(
        " ",
      ),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuthorized);
  // 3. Create community as member
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: ArrayUtil.repeat(10, () => RandomGenerator.alphabets(1))
            .join("")
            .toLowerCase(),
          description: ArrayUtil.repeat(2, () =>
            ArrayUtil.repeat(5, () => RandomGenerator.alphabets(3)).join(""),
          ).join(" "),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create snapshot as admin
  const snapshot =
    await generate_random_community_platform_admin_snapshots_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          code: ArrayUtil.repeat(8, () => RandomGenerator.alphabets(1)).join(
            "",
          ),
          name: community.name,
          description: community.description,
          type: "public",
          status: "active",
          visibility: "public",
          is_nsfw: false,
          is_archived: false,
          is_locked: false,
          member_count: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
          subscriber_count: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
          post_count: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
          comment_count: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
          owner_member_id: memberAuthorized.id,
        } satisfies ICommunityPlatformCommunitySnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 5. Retrieve snapshot via target endpoint
  const retrieved =
    await api.functional.communityPlatform.admin.communities.snapshots.at(
      adminConnection,
      {
        communityId: community.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrieved);
  // 6. Verify snapshot contains all expected fields
  TestValidator.equals("snapshot id matches", retrieved.id, snapshot.id);
  TestValidator.equals("snapshot code matches", retrieved.code, snapshot.code);
  TestValidator.equals("snapshot name matches", retrieved.name, snapshot.name);
  TestValidator.equals(
    "snapshot description matches",
    retrieved.description,
    snapshot.description,
  );
  TestValidator.equals("snapshot type matches", retrieved.type, snapshot.type);
  TestValidator.equals(
    "snapshot status matches",
    retrieved.status,
    snapshot.status,
  );
  TestValidator.equals(
    "snapshot visibility matches",
    retrieved.visibility,
    snapshot.visibility,
  );
  TestValidator.equals(
    "snapshot is_nsfw matches",
    retrieved.is_nsfw,
    snapshot.is_nsfw,
  );
  TestValidator.equals(
    "snapshot is_archived matches",
    retrieved.is_archived,
    snapshot.is_archived,
  );
  TestValidator.equals(
    "snapshot is_locked matches",
    retrieved.is_locked,
    snapshot.is_locked,
  );
  TestValidator.equals(
    "snapshot member_count matches",
    retrieved.member_count,
    snapshot.member_count,
  );
  TestValidator.equals(
    "snapshot subscriber_count matches",
    retrieved.subscriber_count,
    snapshot.subscriber_count,
  );
  TestValidator.equals(
    "snapshot post_count matches",
    retrieved.post_count,
    snapshot.post_count,
  );
  TestValidator.equals(
    "snapshot comment_count matches",
    retrieved.comment_count,
    snapshot.comment_count,
  );
  TestValidator.equals(
    "snapshot owner id matches",
    retrieved.owner.id,
    snapshot.owner.id,
  );
  TestValidator.equals(
    "snapshot community id matches",
    retrieved.community.id,
    community.id,
  );
  TestValidator.predicate(
    "snapshot has created_at",
    () => retrieved.created_at !== null && retrieved.created_at.length > 0,
  );
  // 7. Validate snapshot belongs to correct community
  TestValidator.equals(
    "snapshot belongs to correct community",
    retrieved.community.id,
    community.id,
  );
  TestValidator.equals(
    "snapshot community name matches",
    retrieved.community.name,
    community.name,
  );
  TestValidator.equals(
    "snapshot community description matches",
    retrieved.community.description,
    community.description,
  );
  // 8. Confirm immutable historical data preservation - compare individual fields
  TestValidator.equals(
    "snapshot owner email matches",
    retrieved.owner.email,
    snapshot.owner.email,
  );
  TestValidator.equals(
    "snapshot owner username matches",
    retrieved.owner.username,
    snapshot.owner.username,
  );
}
