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

export async function test_api_community_search_with_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session for public access
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test default search with partial query
  const searchQuery = RandomGenerator.alphabets(5);
  const defaultResult =
    await api.functional.redditPlatform.guest.communities.search.index(
      guestConnection,
      {
        body: {
          q: searchQuery,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(defaultResult);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", defaultResult.pagination.limit, 20);
  TestValidator.equals(
    "pagination records",
    defaultResult.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", defaultResult.pagination.pages, 0);
  // 4. Test sorting by subscriber_count descending (default)
  const sortByDescResult =
    await api.functional.redditPlatform.guest.communities.search.index(
      guestConnection,
      {
        body: {
          q: searchQuery,
          sortBy: "subscriber_count" satisfies
            | "subscriber_count"
            | "created_at"
            | "name",
          sortOrder: "desc" satisfies "asc" | "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortByDescResult);
  // 5. Test sorting by created_at ascending
  const sortByAscResult =
    await api.functional.redditPlatform.guest.communities.search.index(
      guestConnection,
      {
        body: {
          q: searchQuery,
          sortBy: "created_at" satisfies
            | "subscriber_count"
            | "created_at"
            | "name",
          sortOrder: "asc" satisfies "asc" | "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortByAscResult);
  // 6. Test sorting by name
  const sortByNameResult =
    await api.functional.redditPlatform.guest.communities.search.index(
      guestConnection,
      {
        body: {
          q: searchQuery,
          sortBy: "name" satisfies "subscriber_count" | "created_at" | "name",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortByNameResult);
  // 7. Test case-insensitive search
  const caseInsensitiveQuery = "TeSt".toUpperCase();
  const caseInsensitiveResult =
    await api.functional.redditPlatform.guest.communities.search.index(
      guestConnection,
      {
        body: {
          q: caseInsensitiveQuery,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(caseInsensitiveResult);
  // 8. Test pagination parameters
  const paginationResult =
    await api.functional.redditPlatform.guest.communities.search.index(
      guestConnection,
      {
        body: {
          q: searchQuery,
          page: 2 satisfies number,
          limit: 10 satisfies number,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    2 satisfies number,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    10 satisfies number,
  );
  // 9. Validate community metadata structure
  if (defaultResult.data.length > 0) {
    const community = defaultResult.data[0];
    typia.assert(community);
    TestValidator.predicate(
      "community name is string",
      typeof community.name === "string",
    );
    TestValidator.predicate(
      "community subscriber_count is number",
      typeof community.subscriber_count === "number",
    );
    TestValidator.predicate(
      "community created_at is string",
      typeof community.created_at === "string",
    );
  }
  // 10. Test with min/max subscribers filter
  const subscriberFilterResult =
    await api.functional.redditPlatform.guest.communities.search.index(
      guestConnection,
      {
        body: {
          q: searchQuery,
          min_subscribers: 0 satisfies number,
          max_subscribers: 1000 satisfies number,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(subscriberFilterResult);
}
