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

export async function test_api_admin_search_content_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare admin credentials
  const adminPassword = "1234";
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name(1);
  // 2. Register admin account
  const registerResult = await api.functional.redditLike.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeAdmin.IJoin,
    },
  );
  typia.assert(registerResult);
  // 3. Create new connection with auth token from registration
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: registerResult.token.access };
  // 4. Execute search with filters
  const searchResult =
    await api.functional.redditLike.admin.search.content.search(
      adminConnection,
      {
        body: {
          query: "tutorial",
          start_date: new Date(
            new Date().getTime() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
          sort: "relevance",
          page: 1,
          limit: 50,
        } satisfies IRedditLikeContentSearch.IRequest,
      },
    );
  typia.assert(searchResult);
  // 5. Validate response structure
  TestValidator.equals("pagination exists", searchResult.pagination.current, 1);
  TestValidator.predicate(
    "pagination has records",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchResult.data),
  );
  TestValidator.equals("limit matches", searchResult.pagination.limit, 50);
}
