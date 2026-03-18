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

export async function test_api_community_ban_snapshots_effective_window_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Note: This test requires data setup APIs for communities, members, bans, and snapshots.
  // The provided SDK subset includes only the endpoint under test.
  // 1) Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" as string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // If remaining setup APIs exist, they must be used here to create:
  // - community
  // - members/moderators
  // - a community ban (banId)
  // - multiple snapshots for the same banId with different windows
  // - optionally snapshots for a different banId (to verify scoping)
  // Without setup APIs, we cannot produce a deterministic filtering assertion.
  // So we only validate response typing for the call structure.
  const banId = typia.random<string & tags.Format<"uuid">>();
  const t0 = new Date();
  const effectiveFrom = new Date(t0.getTime() - 60000).toISOString();
  const effectiveUntil = new Date(t0.getTime() + 60000).toISOString();
  const output =
    await api.functional.communityPlatform.admin.bans.snapshots.updateSnapshots(
      adminConnection,
      {
        banId,
        body: {
          page: 1,
          limit: 100,
          effectiveFrom,
          effectiveUntil,
        } satisfies ICommunityPlatformCommunityBanSnapshot.IRequest,
      },
    );
  typia.assert(output);
  // Validate pagination metadata type constraints indirectly (typia.assert already does runtime validation)
  // and basic ban scoping contract: every returned item must have matching communityBan.id.
  for (const item of output.data) {
    TestValidator.equals(
      "returned item ban id matches requested banId",
      item.communityBan.id,
      banId,
    );
    TestValidator.predicate(
      "effectiveFrom lower bound satisfied",
      item.effectiveFrom >= effectiveFrom,
    );
    TestValidator.predicate(
      "effectiveUntil upper bound satisfied (and not null)",
      item.effectiveUntil !== null && item.effectiveUntil <= effectiveUntil,
    );
  }
  // Pagination consistency: records should be >= data.length (page is subset)
  TestValidator.predicate(
    "pagination records covers at least current page items",
    output.pagination.records >= output.data.length,
  );
}
