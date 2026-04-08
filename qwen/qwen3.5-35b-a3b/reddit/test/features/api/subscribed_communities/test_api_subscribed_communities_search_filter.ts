import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscribed_communities_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Use member connection with auth token (already mutated by authorize_member_join)
  const authConnection: api.IConnection = memberConnection;
  // 3. Test empty search - should return all subscriptions (simulated)
  const emptySearchResult =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      authConnection,
      { body: {} },
    );
  typia.assert(emptySearchResult);
  // 4. Test single word search (case-insensitive substring matching)
  const searchWord = "tech";
  const techSearchResult =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      authConnection,
      { body: { search: searchWord } },
    );
  typia.assert(techSearchResult);
  // 5. Test case-insensitive search (same results as lowercase)
  const techSearchResultUpper =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      authConnection,
      { body: { search: "TECH" } },
    );
  typia.assert(techSearchResultUpper);
  TestValidator.equals(
    "case insensitive search",
    techSearchResult.data.length,
    techSearchResultUpper.data.length,
  );
  // 6. Test multi-word search
  const multiWordResult =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      authConnection,
      { body: { search: "python programmers" } },
    );
  typia.assert(multiWordResult);
  // 7. Test no results case
  const noResultsSearch =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      authConnection,
      { body: { search: "nonexistent_keyword_xyz_12345" } },
    );
  typia.assert(noResultsSearch);
  TestValidator.equals(
    "empty results when no match",
    noResultsSearch.data.length,
    0,
  );
  TestValidator.equals(
    "records should be 0",
    noResultsSearch.pagination.records,
    0,
  );
  // 8. Test search with sorting
  const sortedSearchResult =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      authConnection,
      { body: { search: "community", sort_by: "name", sort_order: "asc" } },
    );
  typia.assert(sortedSearchResult);
  // 9. Test search with pagination
  const paginatedSearchResult =
    await api.functional.redditPlatform.member.communities.subscribed.index(
      authConnection,
      { body: { search: "tech", page: 1, limit: 5 } },
    );
  typia.assert(paginatedSearchResult);
  TestValidator.predicate(
    "limit respected",
    paginatedSearchResult.data.length <= 5,
  );
  // 10. Validate pagination metadata is correct for filtered results
  TestValidator.predicate(
    "records is non-negative",
    paginatedSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "current page is positive",
    paginatedSearchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pages is non-negative",
    paginatedSearchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    paginatedSearchResult.pagination.limit >= 1,
  );
}
