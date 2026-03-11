import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeSearchResult";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeContentSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentSearch";
import type { IRedditLikeSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSearchResult";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_search_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IRedditLikeAdmin.ILogin,
  });
  // 2. Search for 'announcement' sorted by 'new'
  const announcementNew =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          query: "announcement",
          sort: "new",
        } satisfies IRedditLikeContentSearch.IRequest,
      },
    );
  typia.assert(announcementNew);
  // 3. Search for 'update' sorted by 'hot'
  const updateHot = await api.functional.redditLike.admin.search.content.search(
    adminConnection,
    {
      body: {
        query: "update",
        sort: "hot",
      } satisfies IRedditLikeContentSearch.IRequest,
    },
  );
  typia.assert(updateHot);
  // 4. Search for 'guide' sorted by 'controversial'
  const guideControversial =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          query: "guide",
          sort: "controversial",
        } satisfies IRedditLikeContentSearch.IRequest,
      },
    );
  typia.assert(guideControversial);
  // 5. Validate search results structure
  TestValidator.predicate(
    "announcement search has results",
    () => announcementNew.data.length > 0,
  );
  TestValidator.predicate(
    "update search has results",
    () => updateHot.data.length > 0,
  );
  TestValidator.predicate(
    "guide search has results",
    () => guideControversial.data.length > 0,
  );
  // 6. Validate pagination structure
  TestValidator.predicate(
    "has pagination info",
    () => announcementNew.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination has correct fields",
    typeof announcementNew.pagination.current,
    "number",
  );
}
