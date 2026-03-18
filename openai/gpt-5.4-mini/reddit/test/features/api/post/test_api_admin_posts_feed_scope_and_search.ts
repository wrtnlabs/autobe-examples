import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_posts_feed_scope_and_search(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123" satisfies string,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const searchToken = RandomGenerator.alphabets(5);
  const popular = await api.functional.communityPlatform.admin.posts.index(
    adminConnection,
    {
      body: {
        search: searchToken,
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(popular);
  const communityScoped =
    await api.functional.communityPlatform.admin.posts.index(adminConnection, {
      body: {
        search: searchToken,
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(communityScoped);
  TestValidator.equals(
    "popular pagination page",
    popular.pagination.current,
    1,
  );
  TestValidator.equals(
    "community pagination page",
    communityScoped.pagination.current,
    1,
  );
  TestValidator.equals(
    "popular pagination limit",
    popular.pagination.limit,
    10,
  );
  TestValidator.equals(
    "community pagination limit",
    communityScoped.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "popular records are non-negative",
    popular.pagination.records >= 0,
  );
  TestValidator.predicate(
    "community records are non-negative",
    communityScoped.pagination.records >= 0,
  );
  TestValidator.predicate(
    "popular response contains summaries",
    popular.data.length <= popular.pagination.limit,
  );
  TestValidator.predicate(
    "community response contains summaries",
    communityScoped.data.length <= communityScoped.pagination.limit,
  );
}
