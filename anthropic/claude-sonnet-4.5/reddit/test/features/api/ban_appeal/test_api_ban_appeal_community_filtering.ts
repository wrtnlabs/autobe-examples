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
 * Test filtering ban appeals by specific community name when retrieving the
 * appeal queue.
 *
 * This test validates that moderators can narrow appeal results to a single
 * community context. It creates a moderator account, then filters ban appeals
 * by specific community names to verify that only appeals associated with the
 * specified community are returned and that appeals from other communities are
 * excluded. It also tests filtering by non-existent community names to ensure
 * proper empty result handling.
 *
 * Test steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Retrieve all ban appeals without filtering to establish baseline
 * 3. Filter ban appeals by a specific community name
 * 4. Verify that only appeals from the specified community are returned
 * 5. Test filtering by a non-existent community name
 * 6. Verify that empty results are returned for non-existent communities
 */
export async function test_api_ban_appeal_community_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
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

  // Step 2: Retrieve all ban appeals without filtering
  const allAppealsRequest = {
    page: 1,
    limit: 100,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const allAppealsResponse: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: allAppealsRequest,
      },
    );
  typia.assert(allAppealsResponse);

  // If there are appeals, test filtering by specific community
  if (allAppealsResponse.data.length > 0) {
    // Step 3: Pick a specific community name from the available appeals
    const targetCommunity = allAppealsResponse.data[0].community;
    const targetCommunityName = targetCommunity.name;

    // Step 4: Filter ban appeals by the specific community name
    const filteredRequest = {
      page: 1,
      limit: 100,
      community_name: targetCommunityName,
    } satisfies IRedditCommunityBanAppeal.IRequest;

    const filteredResponse: IPageIRedditCommunityBanAppeal.ISummary =
      await api.functional.redditCommunity.moderator.banAppeals.index(
        connection,
        {
          body: filteredRequest,
        },
      );
    typia.assert(filteredResponse);

    // Step 5: Verify all returned appeals belong to the specified community
    TestValidator.predicate(
      "all filtered appeals should belong to the specified community",
      filteredResponse.data.every(
        (appeal) => appeal.community.name === targetCommunityName,
      ),
    );

    // Verify that appeals from other communities are excluded
    const otherCommunityAppeals = allAppealsResponse.data.filter(
      (appeal) => appeal.community.name !== targetCommunityName,
    );

    if (otherCommunityAppeals.length > 0) {
      TestValidator.predicate(
        "filtered results should not contain appeals from other communities",
        !filteredResponse.data.some((appeal) =>
          otherCommunityAppeals.some((other) => other.id === appeal.id),
        ),
      );
    }
  }

  // Step 6: Test filtering by non-existent community name
  const nonExistentCommunityName = `nonexistent_${RandomGenerator.alphaNumeric(16)}`;

  const emptyFilterRequest = {
    page: 1,
    limit: 100,
    community_name: nonExistentCommunityName,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const emptyResponse: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: emptyFilterRequest,
      },
    );
  typia.assert(emptyResponse);

  // Step 7: Verify empty results for non-existent community
  TestValidator.equals(
    "non-existent community should return empty results",
    emptyResponse.data.length,
    0,
  );

  TestValidator.equals(
    "pagination should show zero records for non-existent community",
    emptyResponse.pagination.records,
    0,
  );
}
