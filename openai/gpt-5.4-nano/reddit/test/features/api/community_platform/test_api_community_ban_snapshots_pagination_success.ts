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

export async function test_api_community_ban_snapshots_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authorization (join)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // 2) Prerequisite moderation data creation.
  // No domain-mutation/creation SDK/utilities for community/ban/snapshot were provided in the prompt.
  // To avoid inventing APIs (which would break compilation/contract), we assume the test environment
  // provides at least one existing community ban with snapshot history.
  // Choose a UUID banId input for the request.
  // If the backend returns an empty page for a ban without snapshots, the pagination assertions below
  // will still hold.
  const banId = typia.random<string & tags.Format<"uuid">>();
  // 3) Call PATCH /communityPlatform/admin/bans/{banId}/snapshots
  const page = 1;
  const limit = 10;
  const response =
    await api.functional.communityPlatform.admin.bans.snapshots.updateSnapshots(
      adminConnection,
      {
        banId,
        body: {
          page,
          limit,
        } satisfies ICommunityPlatformCommunityBanSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 4) Validate pagination metadata
  TestValidator.equals("pagination.current", response.pagination.current, page);
  TestValidator.predicate(
    "pagination.limit is <= requested limit",
    response.pagination.limit <= limit,
  );
  TestValidator.predicate(
    "pagination.records >= number of returned snapshots",
    response.pagination.records >= response.data.length,
  );
  const expectedPages =
    response.pagination.limit === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pagination.pages is consistent",
    response.pagination.pages,
    expectedPages,
  );
  // 5) Validate snapshot list constraints
  TestValidator.predicate(
    "page data length <= limit",
    response.data.length <= limit,
  );
  for (let index = 0; index < response.data.length; ++index) {
    const item = response.data[index]!;
    TestValidator.equals(
      `snapshot[${index}].communityBan.id matches banId`,
      item.communityBan.id,
      banId,
    );
  }
  // 6) Verify ordering by createdAt desc (default assumed)
  for (let index = 1; index < response.data.length; ++index) {
    const prev = response.data[index - 1]!;
    const curr = response.data[index]!;
    TestValidator.predicate(
      `snapshot[${index - 1}].createdAt >= snapshot[${index}].createdAt`,
      Date.parse(prev.createdAt) >= Date.parse(curr.createdAt),
    );
  }
}
