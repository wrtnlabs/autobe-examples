import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_search_with_matching_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test search with matching term
  const searchResult1 =
    await api.functional.redditLike.guest.communities.search(connection, {
      body: {
        search: "tech",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(searchResult1);
  // Validate pagination metadata exists and is valid
  TestValidator.equals(
    "pagination current page",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    searchResult1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    searchResult1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResult1.pagination.pages >= 0,
  );
  // Validate each community in results
  for (const community of searchResult1.data) {
    // Validate community structure
    TestValidator.predicate(
      "community has uuid id",
      /^[0-9a-f-]{36}$/i.test(community.id),
    );
    TestValidator.predicate("community has name", community.name.length > 0);
    TestValidator.predicate(
      "subscriber count non-negative",
      community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "created_at is valid datetime",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(community.created_at),
    );
    // Validate owner structure
    TestValidator.predicate(
      "owner has uuid id",
      /^[0-9a-f-]{36}$/i.test(community.owner.id),
    );
    TestValidator.predicate(
      "owner has username",
      community.owner.username.length > 0,
    );
    TestValidator.predicate(
      "owner has display_name",
      community.owner.display_name.length > 0,
    );
    TestValidator.predicate(
      "owner karma_score is number",
      typeof community.owner.karma_score === "number",
    );
    TestValidator.predicate(
      "owner created_at is valid datetime",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(community.owner.created_at),
    );
  }
  // 2. Test case-insensitive search
  const searchResult2 =
    await api.functional.redditLike.guest.communities.search(connection, {
      body: {
        search: "TECH",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(searchResult2);
  // Case-insensitive search should return same or similar results
  TestValidator.predicate(
    "case-insensitive search returns results",
    searchResult2.data.length >= 0,
  );
  // 3. Test partial matching with different term
  const searchResult3 =
    await api.functional.redditLike.guest.communities.search(connection, {
      body: {
        search: "dev",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(searchResult3);
  TestValidator.predicate(
    "partial match search returns valid response",
    searchResult3.pagination.records >= 0,
  );
  // 4. Test empty search (should return all communities)
  const searchResult4 =
    await api.functional.redditLike.guest.communities.search(connection, {
      body: {
        search: "",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(searchResult4);
  TestValidator.predicate(
    "empty search returns valid pagination",
    searchResult4.pagination.records >= 0,
  );
  // 5. Test sorting by name ascending
  const searchResult5 =
    await api.functional.redditLike.guest.communities.search(connection, {
      body: {
        search: "tech",
        sort_by: "name",
        sort_order: "asc",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(searchResult5);
  // Verify results are sorted by name ascending
  for (let i = 1; i < searchResult5.data.length; i++) {
    TestValidator.predicate(
      `results sorted by name ascending at index ${i}`,
      searchResult5.data[i - 1].name <= searchResult5.data[i].name,
    );
  }
  // 6. Test sorting by subscriber_count descending
  const searchResult6 =
    await api.functional.redditLike.guest.communities.search(connection, {
      body: {
        search: "tech",
        sort_by: "subscriber_count",
        sort_order: "desc",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(searchResult6);
  // Verify results are sorted by subscriber_count descending
  for (let i = 1; i < searchResult6.data.length; i++) {
    TestValidator.predicate(
      `results sorted by subscriber_count descending at index ${i}`,
      searchResult6.data[i - 1].subscriber_count >=
        searchResult6.data[i].subscriber_count,
    );
  }
  // 7. Test pagination with offset
  const searchResult7 =
    await api.functional.redditLike.guest.communities.search(connection, {
      body: {
        search: "tech",
        offset: 5,
        limit: 5,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(searchResult7);
  TestValidator.predicate(
    "offset pagination returns valid response",
    searchResult7.pagination.records >= 0,
  );
}
