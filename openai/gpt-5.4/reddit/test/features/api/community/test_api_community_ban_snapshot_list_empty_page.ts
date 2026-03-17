import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBanSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_communities_bans_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_create";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_ban_snapshot_list_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const communityBan =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId,
        },
      },
    );
  typia.assert(communityBan);
  const requestBody = {
    snapshotId: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunityBanSnapshot.IRequest;
  const snapshots =
    await api.functional.communityPlatform.admin.communities.bans.snapshots.index(
      adminConnection,
      {
        communityId: communityBan.community.id,
        banId: communityBan.id,
        body: requestBody,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "pagination current page matches request",
    snapshots.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    snapshots.pagination.limit,
    requestBody.limit,
  );
  TestValidator.equals(
    "empty filtered result has zero records",
    snapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filtered result has zero pages",
    snapshots.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty filtered result returns no rows",
    snapshots.data.length,
    0,
  );
}
