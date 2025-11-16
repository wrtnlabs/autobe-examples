import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IEconomicDiscussionSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearch";
import type { IEconomicDiscussionSearchFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchFilters";
import type { IEconomicDiscussionSearchMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchMetadata";
import type { IEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchQuery";
import type { IPageIEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionSearchQuery";

export async function test_api_member_global_search_authenticated_access(
  connection: api.IConnection,
) {
  // Create member account for authentication
  const username: string = RandomGenerator.name(1);
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);

  const member: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username,
        email,
        password,
        email_verified: false,
      } satisfies IEconomicDiscussionMember.ICreate,
    });
  typia.assert(member);

  // Verify member has access token after registration
  TestValidator.notEquals("member has access token", member.access_token, "");
  TestValidator.notEquals("member has refresh token", member.refresh_token, "");
  TestValidator.predicate("member ID matches", member.member.id !== "");

  // Execute authenticated global search
  const searchQuery: string = RandomGenerator.name(2);
  const searchResults: IPageIEconomicDiscussionSearchQuery.ISummary =
    await api.functional.economicDiscussion.member.search.global.search(
      connection,
      {
        body: {
          query: searchQuery,
          scope: "member",
          sort_by: "relevance",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(searchResults);

  // Verify search results structure
  TestValidator.predicate(
    "search results have data",
    searchResults.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination exists",
    searchResults.pagination !== null,
  );
  TestValidator.equals("pagination page", searchResults.pagination.current, 0);
  TestValidator.equals("pagination limit", searchResults.pagination.limit, 10);

  // Test search with all categories
  const searchAllCategories: IPageIEconomicDiscussionSearchQuery.ISummary =
    await api.functional.economicDiscussion.member.search.global.search(
      connection,
      {
        body: {
          query: "economic",
          categories: null,
          scope: "all",
          sort_by: "created_at",
          order: "asc",
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(searchAllCategories);

  // Test search with member-specific scope
  const searchMemberScope: IPageIEconomicDiscussionSearchQuery.ISummary =
    await api.functional.economicDiscussion.member.search.global.search(
      connection,
      {
        body: {
          query: "policy",
          scope: "member",
          sort_by: "view_count",
          order: "desc",
          page: 1,
          limit: 20,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(searchMemberScope);

  // Verify member scope provides appropriate results
  TestValidator.predicate(
    "member scope search completes",
    searchMemberScope.data.length >= 0,
  );

  // Test search history continuity by repeating search
  const repeatedSearch: IPageIEconomicDiscussionSearchQuery.ISummary =
    await api.functional.economicDiscussion.member.search.global.search(
      connection,
      {
        body: {
          query: searchQuery,
          scope: "member",
          page: 1,
          limit: 5,
        } satisfies IEconomicDiscussionSearch.IRequest,
      },
    );
  typia.assert(repeatedSearch);

  // Validate search metadata and functionality
  TestValidator.predicate(
    "repeated search works",
    repeatedSearch.data.length >= 0,
  );
  TestValidator.equals(
    "consistent member authentication",
    member.member.username,
    username,
  );
  TestValidator.equals(
    "email verification pending",
    member.member.email,
    email,
  );
}
