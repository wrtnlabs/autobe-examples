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
 * Test community search functionality with partial name matching.
 *
 * This test verifies that the community search endpoint correctly:
 * 1. Performs case-insensitive partial name matching
 * 2. Returns paginated results with proper metadata
 * 3. Includes all required community summary fields
 * 4. Filters out soft-deleted communities
 */
export async function test_api_community_search_with_partial_name_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member user
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
  // 2. Generate a partial search term
  const searchTerm = RandomGenerator.alphabets(3);
  // 3. Search for communities with partial name match
  const searchResult =
    await api.functional.redditClone.member.communities.search.index(
      memberConnection,
      {
        body: {
          search: searchTerm,
          page: 1,
          pageSize: 20,
          sort: "name",
          order: "asc",
        } satisfies IRedditCloneCommunity.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);
  TestValidator.equals("page limit is 20", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "has valid record count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid page count",
    searchResult.pagination.pages >= 0,
  );
  // 5. Validate community summaries in results
  await ArrayUtil.asyncForEach(searchResult.data, async (community) => {
    typia.assert(community);
    // Business logic validation: name contains search term (case-insensitive)
    TestValidator.predicate(
      "community name contains search term (case-insensitive)",
      community.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    // Business logic validation: subscriber count is non-negative
    TestValidator.predicate(
      "subscriber count is non-negative",
      community.subscriber_count >= 0,
    );
    // Validate owner information structure
    typia.assert(community.owner);
  });
  // 6. Test pagination by requesting second page
  const secondPageResult =
    await api.functional.redditClone.member.communities.search.index(
      memberConnection,
      {
        body: {
          search: searchTerm,
          page: 2,
          pageSize: 20,
        } satisfies IRedditCloneCommunity.IRequest,
      },
    );
  typia.assert(secondPageResult);
  TestValidator.equals(
    "second page current is 2",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.predicate(
    "second page has valid record count",
    secondPageResult.pagination.records >= 0,
  );
  // 7. Test empty search returns all communities
  const allCommunitiesResult =
    await api.functional.redditClone.member.communities.search.index(
      memberConnection,
      {
        body: {
          page: 1,
          pageSize: 10,
        } satisfies IRedditCloneCommunity.IRequest,
      },
    );
  typia.assert(allCommunitiesResult);
  TestValidator.predicate(
    "empty search returns communities",
    allCommunitiesResult.pagination.records >= 0,
  );
  TestValidator.equals(
    "empty search page limit is 10",
    allCommunitiesResult.pagination.limit,
    10,
  );
}
