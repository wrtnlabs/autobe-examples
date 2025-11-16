import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test the general search functionality for retrieving member ban history.
 *
 * This test validates that the ban history search endpoint accepts various
 * search parameters and returns properly structured paginated responses. It
 * tests the search parameter with different values including empty strings,
 * alphanumeric keywords, special characters, and Unicode text to ensure the API
 * handles diverse search queries correctly.
 *
 * The test focuses on API contract validation rather than specific data
 * verification.
 */
export async function test_api_member_ban_history_search_functionality(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // Step 2: Generate a test username for search queries
  const testUsername = RandomGenerator.alphaNumeric(8);

  // Step 3: Search with empty string - tests basic retrieval
  const emptySearchBody = {
    search: "",
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const emptySearchResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: emptySearchBody,
      },
    );
  typia.assert(emptySearchResult);

  // Step 4: Test search with alphanumeric keyword
  const searchKeyword = RandomGenerator.alphaNumeric(6);
  const keywordSearchBody = {
    search: searchKeyword,
    page: 1,
    limit: 20,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const keywordSearchResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: keywordSearchBody,
      },
    );
  typia.assert(keywordSearchResult);

  // Step 5: Test case variation (uppercase)
  const upperCaseSearch = searchKeyword.toUpperCase();
  const caseSearchBody = {
    search: upperCaseSearch,
    page: 1,
    limit: 20,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const caseInsensitiveResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: caseSearchBody,
      },
    );
  typia.assert(caseInsensitiveResult);

  // Step 6: Test search with special character
  const specialChar = RandomGenerator.pick([..."!@#$%"]);
  const specialCharBody = {
    search: specialChar,
    page: 1,
    limit: 15,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const specialCharResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: specialCharBody,
      },
    );
  typia.assert(specialCharResult);

  // Step 7: Test search with Unicode text
  const unicodeSearchBody = {
    search: "테스트",
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const unicodeResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: unicodeSearchBody,
      },
    );
  typia.assert(unicodeResult);

  // Step 8: Test partial keyword search
  const partialKeyword = searchKeyword.substring(0, 3);
  const partialSearchBody = {
    search: partialKeyword,
    page: 1,
    limit: 25,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const partialMatchResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: partialSearchBody,
      },
    );
  typia.assert(partialMatchResult);

  // Step 9: Validate pagination structure is correct
  TestValidator.predicate(
    "pagination should have valid structure",
    emptySearchResult.pagination.current >= 0 &&
      emptySearchResult.pagination.limit > 0 &&
      emptySearchResult.pagination.records >= 0 &&
      emptySearchResult.pagination.pages >= 0,
  );

  // Step 10: Validate data array is present
  TestValidator.predicate(
    "response should contain data array",
    Array.isArray(emptySearchResult.data),
  );

  // Step 11: Validate pagination consistency
  TestValidator.predicate(
    "pagination pages calculation should be consistent",
    emptySearchResult.pagination.pages ===
      Math.ceil(
        emptySearchResult.pagination.records /
          emptySearchResult.pagination.limit,
      ),
  );
}
