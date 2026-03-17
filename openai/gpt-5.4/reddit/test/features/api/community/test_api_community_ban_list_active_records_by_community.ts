import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_ban_list_active_records_by_community(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!password",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
    sort: "+started_at",
  } satisfies ICommunityPlatformCommunityBan.IRequest;
  const page =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current is non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned data length does not exceed limit when limit is positive",
    page.pagination.limit === 0 || page.data.length <= page.pagination.limit,
  );
  if (page.pagination.limit > 0) {
    TestValidator.equals(
      "pagination pages matches records and limit",
      page.pagination.pages,
      Math.ceil(page.pagination.records / page.pagination.limit),
    );
  }
  if (page.pagination.records === 0) {
    TestValidator.equals(
      "empty records produce empty data",
      page.data.length,
      0,
    );
  }
  if (page.pagination.records > 0) {
    TestValidator.predicate(
      "non-empty result uses page number at least one",
      page.pagination.current >= 1,
    );
  }
  for (const ban of page.data) {
    TestValidator.equals(
      "ban belongs to requested community",
      ban.community.id,
      communityId,
    );
    TestValidator.equals(
      "active list excludes lifted bans",
      ban.lifted_at,
      null,
    );
    TestValidator.equals(
      "active list excludes deleted bans",
      ban.deleted_at,
      null,
    );
    TestValidator.predicate(
      "ban status is not an obviously inactive state",
      ["lifted", "deleted", "expired"].includes(ban.status.toLowerCase()) ===
        false,
    );
    if (ban.expired_at !== null) {
      TestValidator.predicate(
        "expiration is later than start when provided",
        new Date(ban.expired_at).getTime() > new Date(ban.started_at).getTime(),
      );
    }
  }
}
