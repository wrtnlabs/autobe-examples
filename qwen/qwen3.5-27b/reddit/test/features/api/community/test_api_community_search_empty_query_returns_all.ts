import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test community search with empty query returns all communities.
 *
 * This test validates the edge case where an empty search query is submitted
 * to the community search endpoint. According to business rules, when a user
 * submits an empty search query or clears their search field, the system
 * should return all active communities on the platform.
 *
 * Test Steps:
 * 1. Authenticate as a member user
 * 2. Search communities with empty query string
 * 3. Validate response structure and pagination
 * 4. Verify all communities are returned (not filtered)
 * 5. Check sorting order (alphabetical by name)
 */
export async function test_api_community_search_empty_query_returns_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Search communities with empty query
  const searchResult =
    await api.functional.redditClone.member.communities.search.index(
      memberConnection,
      {
        body: {
          search: "",
          page: 1,
          pageSize: 20,
          sort: "name",
          order: "asc",
        } satisfies IRedditCloneCommunity.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 4. Validate community data is returned
  TestValidator.predicate(
    "community list is an array",
    Array.isArray(searchResult.data),
  );
  // 5. Validate alphabetical sorting by name (business logic)
  if (searchResult.data.length > 1) {
    const names = searchResult.data.map((c) => c.name);
    const sortedNames = [...names].sort();
    TestValidator.equals(
      "communities are sorted alphabetically by name",
      names,
      sortedNames,
    );
  }
  // 6. Validate pagination consistency
  TestValidator.equals(
    "data array length matches expected page size",
    searchResult.data.length,
    Math.min(searchResult.pagination.limit, searchResult.pagination.records),
  );
  // 7. Validate that empty search returns communities (if any exist)
  TestValidator.predicate(
    "empty search returns communities or empty list",
    searchResult.data.length === searchResult.pagination.records,
  );
}
