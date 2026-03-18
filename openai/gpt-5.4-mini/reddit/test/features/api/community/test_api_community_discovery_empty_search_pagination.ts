import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_discovery_empty_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${Date.now()}@test.com` satisfies string &
        tags.Format<"email">,
      password: "password123!" satisfies string &
        tags.MinLength<1> &
        tags.Format<"password">,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const emptySearch =
    await api.functional.communityPlatform.admin.communities.index(
      adminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should return zero records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search should return zero pages",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search should return empty data",
    emptySearch.data.length,
    0,
  );
  const firstPage =
    await api.functional.communityPlatform.admin.communities.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.communityPlatform.admin.communities.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  TestValidator.equals("second page number", secondPage.pagination.current, 2);
  TestValidator.equals(
    "page limit should stay stable",
    firstPage.pagination.limit,
    secondPage.pagination.limit,
  );
  TestValidator.equals(
    "browse records should stay stable across pages",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "browse pages should stay stable across pages",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  TestValidator.predicate(
    "page data should not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit &&
      secondPage.data.length <= secondPage.pagination.limit,
  );
}
