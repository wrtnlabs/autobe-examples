import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Perform search
  const searchKeyword = "tech";
  const searchResult = await api.functional.community.admin.communities.search(
    adminConnection,
    {
      body: { search: searchKeyword } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(searchResult);
  // 3. Validate search result structure (based on provided DTO)
  // Since ICommunityCommunity.ISummary is an empty object {} per the schema,
  // we cannot validate any content properties (name, description, icon, subscriberCount).
  // We can only validate the overall structure.
  // Pagination validation
  TestValidator.equals(
    "pagination current is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    () => searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    () => searchResult.pagination.pages >= 0,
  );
  // Data structure validation
  TestValidator.equals(
    "data is an array",
    Array.isArray(searchResult.data),
    true,
  );
  TestValidator.predicate(
    "data has correct length",
    () =>
      searchResult.data.length === searchResult.pagination.limit ||
      searchResult.data.length === searchResult.pagination.records,
  );
  // Each item must be an object (ICommunityCommunity.ISummary is {}, so any object is valid)
  for (const item of searchResult.data) {
    TestValidator.predicate(
      "each item is an object",
      () => typeof item === "object" && item !== null,
    );
  }
}
