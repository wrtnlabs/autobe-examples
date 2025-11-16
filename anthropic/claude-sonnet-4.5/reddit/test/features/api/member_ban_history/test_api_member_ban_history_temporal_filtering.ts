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
 * Test temporal filtering capabilities for member ban history retrieval.
 *
 * This test validates the API's ability to accept and process temporal filter
 * parameters: created_from, created_to, expires_from, and expires_to when
 * querying member ban records.
 *
 * Test workflow:
 *
 * 1. Authenticate as a moderator
 * 2. Test creation date filtering (created_from, created_to)
 * 3. Test expiration date filtering (expires_from, expires_to)
 * 4. Test combined temporal filters
 * 5. Validate edge cases (permanent bans filter, single-sided ranges)
 * 6. Verify response structure and pagination
 */
export async function test_api_member_ban_history_temporal_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Generate a test username for filtering
  const testUsername = RandomGenerator.name(1).toLowerCase();

  // Step 2: Test created_from and created_to filtering
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const created30DaysAgo = new Date(
    now.getTime() - 30 * oneDayMs,
  ).toISOString();
  const created20DaysAgo = new Date(
    now.getTime() - 20 * oneDayMs,
  ).toISOString();
  const created10DaysAgo = new Date(
    now.getTime() - 10 * oneDayMs,
  ).toISOString();
  const createdToday = now.toISOString();

  // Test created_from filter
  const createdFromResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          created_from: created20DaysAgo,
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(createdFromResult);
  TestValidator.predicate(
    "created_from filter returns valid pagination",
    createdFromResult.pagination.current >= 0,
  );

  // Test created_to filter
  const createdToResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          created_to: created10DaysAgo,
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(createdToResult);
  TestValidator.predicate(
    "created_to filter returns valid pagination",
    createdToResult.pagination.current >= 0,
  );

  // Test combined created_from and created_to (date range)
  const createdRangeResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          created_from: created30DaysAgo,
          created_to: created10DaysAgo,
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(createdRangeResult);
  TestValidator.predicate(
    "created date range filter returns valid result",
    createdRangeResult.pagination.records >= 0,
  );

  // Step 3: Test expires_from and expires_to filtering
  const expires7DaysFromNow = new Date(
    now.getTime() + 7 * oneDayMs,
  ).toISOString();
  const expires15DaysFromNow = new Date(
    now.getTime() + 15 * oneDayMs,
  ).toISOString();
  const expires30DaysFromNow = new Date(
    now.getTime() + 30 * oneDayMs,
  ).toISOString();

  // Test expires_from filter
  const expiresFromResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          expires_from: expires15DaysFromNow,
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(expiresFromResult);
  TestValidator.predicate(
    "expires_from filter returns valid result",
    expiresFromResult.pagination.current >= 0,
  );

  // Test expires_to filter
  const expiresToResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          expires_to: expires15DaysFromNow,
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(expiresToResult);
  TestValidator.predicate(
    "expires_to filter returns valid result",
    expiresToResult.pagination.current >= 0,
  );

  // Test combined expires_from and expires_to (expiration date range)
  const expiresRangeResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          expires_from: expires7DaysFromNow,
          expires_to: expires30DaysFromNow,
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(expiresRangeResult);
  TestValidator.predicate(
    "expiration date range filter returns valid result",
    expiresRangeResult.pagination.records >= 0,
  );

  // Step 4: Test combined creation and expiration filters
  const combinedFiltersResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          created_from: created20DaysAgo,
          created_to: createdToday,
          expires_from: expires7DaysFromNow,
          expires_to: expires30DaysFromNow,
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(combinedFiltersResult);
  TestValidator.predicate(
    "combined temporal filters return valid result",
    combinedFiltersResult.pagination.current >= 0,
  );

  // Step 5: Test edge case - permanent bans (is_permanent filter)
  const permanentBansResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          is_permanent: true,
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(permanentBansResult);
  TestValidator.predicate(
    "permanent bans filter returns valid result",
    permanentBansResult.pagination.current >= 0,
  );

  // Step 6: Test edge case - temporary bans only
  const temporaryBansResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          is_permanent: false,
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(temporaryBansResult);
  TestValidator.predicate(
    "temporary bans filter returns valid result",
    temporaryBansResult.pagination.current >= 0,
  );

  // Step 7: Test pagination with temporal filters
  const paginatedResult: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          created_from: created30DaysAgo,
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit is respected",
    paginatedResult.data.length <= 10,
  );
  TestValidator.equals(
    "pagination page is correct",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    paginatedResult.pagination.limit,
    10,
  );
}
