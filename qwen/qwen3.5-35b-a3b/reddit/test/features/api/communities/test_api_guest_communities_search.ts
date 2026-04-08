import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_communities_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guestResult = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestResult);
  // Create guest connection with token
  const guestAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: guestResult.token.access },
  };
  // 2. Test case-insensitive partial name matching
  const searchTerm = typia
    .random<string & tags.Format<"email">>()
    .split("@")[0]
    .slice(0, 5);
  const searchResult =
    await api.functional.redditCommunity.guest.communities.index(
      guestAuthConnection,
      {
        body: {
          name: searchTerm,
          limit: 10,
          page: 1,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate response structure
  TestValidator.predicate(
    "records is a number",
    typeof searchResult.pagination.records === "number",
  );
  TestValidator.predicate("has data array", Array.isArray(searchResult.data));
  // 3. Test case-insensitive matching with uppercase
  const uppercaseSearch = searchTerm.toUpperCase();
  const uppercaseResult =
    await api.functional.redditCommunity.guest.communities.index(
      guestAuthConnection,
      {
        body: {
          name: uppercaseSearch,
          limit: 10,
          page: 1,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(uppercaseResult);
  // 4. Test no match scenario
  const noMatchSearch = "nonexistentcommunityxyz123";
  const noMatchResult =
    await api.functional.redditCommunity.guest.communities.index(
      guestAuthConnection,
      {
        body: {
          name: noMatchSearch,
          limit: 10,
          page: 1,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals("no match returns empty", noMatchResult.data.length, 0);
  // 5. Test empty name query returns all communities
  const allCommunities =
    await api.functional.redditCommunity.guest.communities.index(
      guestAuthConnection,
      {
        body: {} satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(allCommunities);
  TestValidator.predicate(
    "empty query returns communities",
    allCommunities.data.length >= 0,
  );
  // 6. Test combining name search with sort
  const sortedSearch =
    await api.functional.redditCommunity.guest.communities.index(
      guestAuthConnection,
      {
        body: {
          name: searchTerm,
          sort: "subscriber_count_desc" as const,
          limit: 10,
          page: 1,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(sortedSearch);
  // 7. Test combining name search with minimum subscriber count
  const filteredSearch =
    await api.functional.redditCommunity.guest.communities.index(
      guestAuthConnection,
      {
        body: {
          name: searchTerm,
          subscriber_count_min: 0,
          limit: 10,
          page: 1,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(filteredSearch);
}
