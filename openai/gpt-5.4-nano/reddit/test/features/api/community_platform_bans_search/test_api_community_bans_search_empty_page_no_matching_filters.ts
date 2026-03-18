import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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

export async function test_api_community_bans_search_empty_page_no_matching_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as admin (admin identity required for admin-only endpoint)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2) Query with filters that should match no existing ban records
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  const page = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const response = await api.functional.communityPlatform.admin.bans.index(
    adminConnection,
    {
      body: {
        onlyActive: true,
        onlyLifted: null,
        communityId,
        bannedUserId,
        page,
        limit,
      } satisfies ICommunityPlatformCommunityBan.IRequest,
    },
  );
  typia.assert(response);
  // 3) Validate empty page + pagination metadata
  TestValidator.equals("bans should be empty", response.data.length, 0);
  TestValidator.equals(
    "pagination.records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination.current should match request page",
    response.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination.limit should match request limit",
    response.pagination.limit,
    limit,
  );
}
