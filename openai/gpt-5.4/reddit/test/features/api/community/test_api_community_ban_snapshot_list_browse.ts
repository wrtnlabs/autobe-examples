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

export async function test_api_community_ban_snapshot_list_browse(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  const requestedCommunityId = typia.random<string & tags.Format<"uuid">>();
  const createdBan =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        params: {
          communityId: requestedCommunityId,
        },
      },
    );
  typia.assert(createdBan);
  const browseBody = {
    page: 1,
    limit: 10,
    sort: "id",
  } satisfies ICommunityPlatformCommunityBanSnapshot.IRequest;
  const firstPage =
    await api.functional.communityPlatform.admin.communities.bans.snapshots.index(
      adminConnection,
      {
        communityId: createdBan.community.id,
        banId: createdBan.id,
        body: browseBody,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current matches requested page",
    firstPage.pagination.current,
    browseBody.page,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    firstPage.pagination.limit,
    browseBody.limit,
  );
  TestValidator.equals(
    "pagination pages derived from records and limit",
    firstPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  TestValidator.predicate(
    "pagination records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length bounded by limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  for (const snapshot of firstPage.data) {
    TestValidator.equals(
      "snapshot belongs to requested ban",
      snapshot.communityBan.id,
      createdBan.id,
    );
    TestValidator.equals(
      "snapshot belongs to requested community",
      snapshot.communityBan.community.id,
      createdBan.community.id,
    );
    if (snapshot.createdByMember !== null) {
      typia.assert(snapshot.createdByMember);
    }
  }
  const firstSnapshot = firstPage.data[0];
  if (firstSnapshot !== undefined) {
    const bySnapshotId =
      await api.functional.communityPlatform.admin.communities.bans.snapshots.index(
        adminConnection,
        {
          communityId: createdBan.community.id,
          banId: createdBan.id,
          body: {
            page: 1,
            limit: 10,
            sort: "id",
            snapshotId: firstSnapshot.id,
          } satisfies ICommunityPlatformCommunityBanSnapshot.IRequest,
        },
      );
    typia.assert(bySnapshotId);
    for (const snapshot of bySnapshotId.data) {
      TestValidator.equals(
        "snapshotId filter keeps only requested snapshot",
        snapshot.id,
        firstSnapshot.id,
      );
      TestValidator.equals(
        "snapshotId filter preserves ban scope",
        snapshot.communityBan.id,
        createdBan.id,
      );
      TestValidator.equals(
        "snapshotId filter preserves community scope",
        snapshot.communityBan.community.id,
        createdBan.community.id,
      );
    }
  }
  const hasAttributedSnapshot = ArrayUtil.has(
    firstPage.data,
    (snapshot) => snapshot.createdByMember !== null,
  );
  const byAttribution =
    await api.functional.communityPlatform.admin.communities.bans.snapshots.index(
      adminConnection,
      {
        communityId: createdBan.community.id,
        banId: createdBan.id,
        body: {
          page: 1,
          limit: 10,
          sort: "id",
          hasCreatedByMember: hasAttributedSnapshot,
        } satisfies ICommunityPlatformCommunityBanSnapshot.IRequest,
      },
    );
  typia.assert(byAttribution);
  for (const snapshot of byAttribution.data) {
    TestValidator.equals(
      "attribution filter preserves ban scope",
      snapshot.communityBan.id,
      createdBan.id,
    );
    TestValidator.equals(
      "attribution filter preserves community scope",
      snapshot.communityBan.community.id,
      createdBan.community.id,
    );
    TestValidator.equals(
      "attribution filter consistency",
      snapshot.createdByMember !== null,
      hasAttributedSnapshot,
    );
  }
}
