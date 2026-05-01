import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all communities without search filter to establish baseline
  const allResponse = await api.functional.communityHub.communities.index(
    connection,
    { body: { limit: 100 } satisfies ICommunityHubCommunity.IRequest },
  );
  typia.assert(allResponse);
  const allNames = allResponse.data.map((c) => c.name).sort();
  if (allNames.length === 0) {
    TestValidator.equals(
      "empty community set pagination records",
      allResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty community set pagination pages",
      allResponse.pagination.pages,
      0,
    );
    return;
  }
  // 2. Extract a substring from the first community name for partial search
  const targetName = allNames[0];
  const searchTerm =
    targetName.length >= 3
      ? targetName.substring(1, targetName.length - 1)
      : targetName;
  // 3. Search with partial name
  const searchResponse = await api.functional.communityHub.communities.index(
    connection,
    {
      body: {
        search: searchTerm,
        limit: 100,
      } satisfies ICommunityHubCommunity.IRequest,
    },
  );
  typia.assert(searchResponse);
  const searchTermLower = searchTerm.toLowerCase();
  for (const community of searchResponse.data) {
    TestValidator.predicate(
      `community "${community.name}" contains search term "${searchTerm}"`,
      community.name.toLowerCase().includes(searchTermLower),
    );
  }
  TestValidator.predicate(
    "filtered records <= total records",
    searchResponse.pagination.records <= allResponse.pagination.records,
  );
  // 4. Test case-insensitive matching
  const upperSearchTerm = searchTerm.toUpperCase();
  if (upperSearchTerm !== searchTerm) {
    const caseResponse = await api.functional.communityHub.communities.index(
      connection,
      {
        body: {
          search: upperSearchTerm,
          limit: 100,
        } satisfies ICommunityHubCommunity.IRequest,
      },
    );
    typia.assert(caseResponse);
    TestValidator.equals(
      "case-insensitive search matches original",
      caseResponse.data.map((c) => c.name).sort(),
      searchResponse.data.map((c) => c.name).sort(),
    );
  }
  // 5. Empty search (search omitted) returns all communities
  const emptyResponse = await api.functional.communityHub.communities.index(
    connection,
    { body: { limit: 100 } satisfies ICommunityHubCommunity.IRequest },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty search returns all communities",
    emptyResponse.data.map((c) => c.name).sort(),
    allNames,
  );
  // 6. Whitespace-only search returns all communities (no filtering applied)
  const whitespaceResponse =
    await api.functional.communityHub.communities.index(connection, {
      body: {
        search: "   ",
        limit: 100,
      } satisfies ICommunityHubCommunity.IRequest,
    });
  typia.assert(whitespaceResponse);
  TestValidator.equals(
    "whitespace-only search returns all communities",
    whitespaceResponse.data.map((c) => c.name).sort(),
    allNames,
  );
  // 7. Pagination metadata reflects post-filter result count
  if (allNames.length >= 2) {
    const pagedResponse = await api.functional.communityHub.communities.index(
      connection,
      {
        body: {
          search: searchTerm,
          limit: 2,
          page: 1,
        } satisfies ICommunityHubCommunity.IRequest,
      },
    );
    typia.assert(pagedResponse);
    TestValidator.equals(
      "pagination limit matches request",
      pagedResponse.pagination.limit,
      2,
    );
    TestValidator.equals(
      "pagination current page",
      pagedResponse.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination records matches filtered total",
      pagedResponse.pagination.records,
      searchResponse.pagination.records,
    );
    const expectedPages = Math.ceil(searchResponse.pagination.records / 2);
    TestValidator.equals(
      "pagination pages computed correctly",
      pagedResponse.pagination.pages,
      expectedPages,
    );
    TestValidator.predicate(
      "page data length does not exceed limit",
      pagedResponse.data.length <= 2,
    );
  }
}
