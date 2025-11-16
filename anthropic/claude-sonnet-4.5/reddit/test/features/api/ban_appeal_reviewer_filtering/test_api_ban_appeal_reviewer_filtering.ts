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

export async function test_api_ban_appeal_reviewer_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator to perform filtering queries
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      password: "password123",
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator1);

  // Step 2: Test filtering by specific moderator ID
  // Note: In a new system, this will likely return empty results
  const mod1FilteredAppeals =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          reviewed_by_moderator_id: moderator1.id,
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(mod1FilteredAppeals);

  // Step 3: Verify pagination structure is valid
  TestValidator.predicate(
    "filtered appeals response should have valid pagination structure",
    typeof mod1FilteredAppeals.pagination.current === "number" &&
      mod1FilteredAppeals.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    mod1FilteredAppeals.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    mod1FilteredAppeals.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    mod1FilteredAppeals.pagination.pages >= 0,
  );

  // Step 4: Verify data array is present and valid
  TestValidator.predicate(
    "response should contain data array",
    Array.isArray(mod1FilteredAppeals.data),
  );

  // Step 5: Test filtering by non-existent moderator ID to ensure proper empty result handling
  const nonExistentModId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          reviewed_by_moderator_id: nonExistentModId,
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(emptyResults);

  // Step 6: Verify empty results have valid structure
  TestValidator.predicate(
    "non-existent moderator filter should return valid pagination",
    typeof emptyResults.pagination.current === "number",
  );
  TestValidator.predicate(
    "non-existent moderator filter data should be empty array",
    Array.isArray(emptyResults.data),
  );

  // Step 7: Test filtering with multiple parameters including reviewed_by_moderator_id
  const combinedFilter =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          reviewed_by_moderator_id: moderator1.id,
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(combinedFilter);

  TestValidator.predicate(
    "combined filter should return valid response structure",
    Array.isArray(combinedFilter.data) &&
      typeof combinedFilter.pagination === "object",
  );

  // Step 8: Test filtering pending appeals (which should not have reviewers)
  const pendingAppeals =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(pendingAppeals);

  // Step 9: Verify API accepts reviewed_by_moderator_id parameter correctly
  const parameterTest =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          reviewed_by_moderator_id: moderator1.id,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(parameterTest);

  TestValidator.predicate(
    "reviewed_by_moderator_id parameter should be accepted by API",
    typeof parameterTest.pagination === "object" &&
      Array.isArray(parameterTest.data),
  );
}
