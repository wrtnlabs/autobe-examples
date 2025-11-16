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
 * Test the retrieval of a comprehensive ban appeal queue with filtering and
 * pagination capabilities.
 *
 * This test validates that moderators can successfully retrieve ban appeals
 * using various filter criteria including appeal status, submission date
 * ranges, community filtering, and appellant member filtering. The test creates
 * a moderator account, authenticates, and then retrieves the appeal queue with
 * different parameter combinations.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Retrieve ban appeal queue with basic pagination
 * 3. Validate paginated response structure
 * 4. Test retrieval with status filtering
 * 5. Test retrieval with date range filtering
 * 6. Test retrieval with sorting options
 * 7. Test with multiple filters combined
 */
export async function test_api_ban_appeal_queue_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve ban appeal queue with basic pagination
  const basicRequest = {
    page: 1,
    limit: 20,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const basicResponse: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: basicRequest,
      },
    );
  typia.assert(basicResponse);

  // Step 3: Test retrieval with status filtering
  const statusFilterRequest = {
    page: 1,
    limit: 10,
    status: "pending" as const,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const statusFilterResponse: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: statusFilterRequest,
      },
    );
  typia.assert(statusFilterResponse);

  // Step 4: Test retrieval with date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeRequest = {
    page: 1,
    limit: 15,
    submitted_after: pastDate.toISOString(),
    submitted_before: now.toISOString(),
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const dateRangeResponse: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeResponse);

  // Step 5: Test retrieval with sorting options
  const sortedRequest = {
    page: 1,
    limit: 10,
    sort_by: "submitted_at" as const,
    sort_order: "desc" as const,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const sortedResponse: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: sortedRequest,
      },
    );
  typia.assert(sortedResponse);

  // Step 6: Test with multiple filters combined
  const combinedRequest = {
    page: 1,
    limit: 25,
    status: "approved" as const,
    sort_by: "reviewed_at" as const,
    sort_order: "asc" as const,
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const combinedResponse: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: combinedRequest,
      },
    );
  typia.assert(combinedResponse);

  // Step 7: Test with search query
  const searchRequest = {
    page: 1,
    limit: 20,
    search: RandomGenerator.alphabets(5),
  } satisfies IRedditCommunityBanAppeal.IRequest;

  const searchResponse: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResponse);
}
