import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestAuth);
  // 2. Create new connection with guest token for search
  const searchConnection: api.IConnection = { host: connection.host };
  searchConnection.headers = { Authorization: guestAuth.token.access };
  // 3. Perform search with random query unlikely to match
  const searchQuery = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >() satisfies string;
  const searchResult =
    await api.functional.redditPlatform.guest.communities.search.index(
      searchConnection,
      {
        body: {
          q: searchQuery,
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Validate empty results and pagination metadata
  TestValidator.equals("data array is empty", searchResult.data.length, 0);
  TestValidator.equals(
    "total records is 0",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals("total pages is 0", searchResult.pagination.pages, 0);
  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);
  TestValidator.equals("limit is 20", searchResult.pagination.limit, 20);
}