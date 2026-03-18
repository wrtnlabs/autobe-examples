import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_ban_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const page = 1 satisfies number;
  const limit = 10 satisfies number;
  const first =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          search: RandomGenerator.alphabets(8),
          isActive: true,
          sort: "new",
          page,
          limit,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(first);
  TestValidator.equals("pagination current", first.pagination.current, page);
  TestValidator.equals("pagination limit", first.pagination.limit, limit);
  TestValidator.predicate(
    "pagination records non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "ban list is community scoped",
    first.data.every((ban) => ban.community.id === communityId),
  );
  const second =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId,
        body: {
          search: RandomGenerator.alphabets(8),
          isActive: false,
          sort: "old",
          page: 2,
          limit,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  typia.assert(second);
  TestValidator.equals("second page current", second.pagination.current, 2);
  TestValidator.equals("second page limit", second.pagination.limit, limit);
  TestValidator.predicate(
    "second response is community scoped",
    second.data.every((ban) => ban.community.id === communityId),
  );
  TestValidator.predicate(
    "page slices are not both identical when multiple pages exist",
    first.pagination.records <= limit ||
      JSON.stringify(first.data) !== JSON.stringify(second.data),
  );
}
