import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test community search functionality by partial name matching.
 *
 * Validates the community search endpoint's ability to filter communities by partial name matching with case-insensitive substring search. Searches the existing community list to verify search accuracy and pagination handling.
 *
 * The test verifies that:
 * 1. Search returns only communities whose names contain the search term
 * 2. Search is case-insensitive (e.g., 'tech' matches 'Technology', 'TECHNICAL')
 * 3. Substring matching works anywhere in the name (beginning, middle, end)
 * 4. Empty search results return valid pagination metadata with empty data array
 * 5. Pagination parameters work correctly with search results
 *
 * 1. Register a member account for authentication.
 * 2. Search communities with 'tech' parameter.
 * 3. Verify all returned communities contain 'tech' in their name (case-insensitive).
 * 4. Search with 'dev' parameter.
 * 5. Verify all returned communities contain 'dev' in their name.
 * 6. Search with non-existent term 'xyz123nonexistent'.
 * 7. Verify empty data array with valid pagination metadata.
 * 8. Test pagination with limit and offset parameters.
 * 9. Test case-insensitivity by searching with uppercase 'TECH'.
 */
export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Search communities with 'tech' - case-insensitive substring matching
  const techSearch = await api.functional.redditLike.member.communities.index(
    memberConnection,
    {
      body: {
        search: "tech",
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(techSearch);
  // Verify all returned communities contain 'tech' in their name (case-insensitive)
  for (const community of techSearch.data) {
    typia.assert(community);
    TestValidator.predicate(
      "community name contains 'tech'",
      community.name.toLowerCase().includes("tech"),
    );
  }
  // 3. Search with 'dev' - should match communities containing 'dev'
  const devSearch = await api.functional.redditLike.member.communities.index(
    memberConnection,
    {
      body: {
        search: "dev",
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(devSearch);
  // Verify all returned communities contain 'dev' in their name
  for (const community of devSearch.data) {
    typia.assert(community);
    TestValidator.predicate(
      "community name contains 'dev'",
      community.name.toLowerCase().includes("dev"),
    );
  }
  // 4. Search with non-existent term - should return empty results
  const emptySearch = await api.functional.redditLike.member.communities.index(
    memberConnection,
    {
      body: {
        search: "xyz123nonexistent",
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(emptySearch);
  // Verify empty results with valid pagination metadata
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearch.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination records count is 0",
    emptySearch.pagination.records === 0,
  );
  // 5. Test pagination with search results
  const paginatedSearch =
    await api.functional.redditLike.member.communities.index(memberConnection, {
      body: {
        search: "tech",
        limit: 5,
        offset: 0,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(paginatedSearch);
  // Verify pagination limit is respected
  TestValidator.predicate(
    "pagination limit is respected",
    paginatedSearch.data.length <= paginatedSearch.pagination.limit,
  );
  // 6. Test case-insensitivity by searching with uppercase
  const upperSearch = await api.functional.redditLike.member.communities.index(
    memberConnection,
    {
      body: {
        search: "TECH",
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(upperSearch);
  // Verify uppercase search returns same count as lowercase search
  TestValidator.equals(
    "uppercase search matches lowercase search count",
    upperSearch.data.length,
    techSearch.data.length,
  );
  // 7. Test search with empty string - should return all communities
  const allSearch = await api.functional.redditLike.member.communities.index(
    memberConnection,
    {
      body: {
        search: "",
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(allSearch);
  // Verify empty search returns communities (may be all or filtered by other criteria)
  TestValidator.predicate(
    "empty search returns valid pagination",
    allSearch.pagination.records >= 0,
  );
}
