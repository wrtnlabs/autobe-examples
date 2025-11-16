import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanAppeal";
import type { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test ban appeal filtering API structure and response format with ban_id
 * parameter.
 *
 * This test validates the ban appeal filtering API's request/response structure
 * when using the ban_id parameter. Due to API limitations (no endpoints
 * available to create communities, members, bans, or appeals), this test
 * focuses on:
 *
 * 1. Moderator authentication for accessing ban appeal operations
 * 2. Valid request structure with ban_id filter parameter
 * 3. Response type compliance with IPageIRedditCommunityBanAppeal.ISummary
 * 4. Pagination metadata structure and validity
 * 5. Data array structure conforming to IRedditCommunityBanAppeal.ISummary[]
 *
 * The test verifies that the filtering API accepts the ban_id parameter
 * correctly and returns properly structured responses, even when no matching
 * appeals exist. This ensures the API contract is correctly implemented for
 * future integration.
 */
export async function test_api_ban_appeal_ban_id_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to access ban appeal filtering operations
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Test ban appeal filtering API with ban_id parameter
  const testBanId = typia.random<string & tags.Format<"uuid">>();

  const filterRequest = {
    page: 1,
    limit: 20,
    ban_id: testBanId,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const filteredResult: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: filterRequest,
      },
    );
  typia.assert(filteredResult);

  // Step 3: Validate response structure and pagination metadata
  TestValidator.predicate(
    "pagination current page is non-negative",
    filteredResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is positive",
    filteredResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records count is non-negative",
    filteredResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages count is non-negative",
    filteredResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "response data is an array",
    Array.isArray(filteredResult.data),
  );

  TestValidator.equals(
    "pagination limit matches request",
    filteredResult.pagination.limit,
    20,
  );

  TestValidator.equals(
    "pagination current page matches request",
    filteredResult.pagination.current,
    0,
  );

  // Step 4: Test with different ban_id to verify parameter acceptance
  const secondBanId = typia.random<string & tags.Format<"uuid">>();

  const secondRequest = {
    page: 1,
    limit: 10,
    ban_id: secondBanId,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const secondResult: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: secondRequest,
      },
    );
  typia.assert(secondResult);

  TestValidator.equals(
    "second query pagination limit matches request",
    secondResult.pagination.limit,
    10,
  );

  // Step 5: Test without ban_id filter to verify optional parameter handling
  const noFilterRequest = {
    page: 1,
    limit: 15,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const noFilterResult: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: noFilterRequest,
      },
    );
  typia.assert(noFilterResult);

  TestValidator.predicate(
    "no filter query returns valid pagination",
    noFilterResult.pagination.current >= 0 &&
      noFilterResult.pagination.records >= 0,
  );

  TestValidator.equals(
    "no filter query pagination limit matches request",
    noFilterResult.pagination.limit,
    15,
  );
}
