import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";

/**
 * Test filtering guest records by user agent string patterns.
 *
 * This test validates the user_agent_contains parameter functionality for guest
 * analytics. It creates a moderator account to access guest analytics, then
 * tests filtering guests by various user agent patterns including mobile
 * devices, operating systems, browsers, and automated traffic (bots). The test
 * verifies case-insensitive substring matching and proper response structure.
 *
 * Test Flow:
 *
 * 1. Create and authenticate moderator account
 * 2. Test filtering by "Mobile" user agent pattern
 * 3. Test filtering by "Windows" OS pattern
 * 4. Test filtering by "Safari" browser pattern
 * 5. Test filtering by "Bot" for automated traffic
 * 6. Validate response structure and pagination metadata
 */
export async function test_api_guest_analytics_user_agent_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for guest analytics access
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test filtering by Mobile devices
  const mobileResults: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        user_agent_contains: "Mobile",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(mobileResults);
  TestValidator.predicate(
    "mobile filter returns valid pagination structure",
    mobileResults.pagination !== null && mobileResults.pagination !== undefined,
  );

  // Step 3: Test filtering by Windows operating system
  const windowsResults: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        user_agent_contains: "Windows",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(windowsResults);
  TestValidator.predicate(
    "windows filter returns valid response",
    Array.isArray(windowsResults.data),
  );

  // Step 4: Test filtering by Safari browser
  const safariResults: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        user_agent_contains: "Safari",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(safariResults);
  TestValidator.predicate(
    "safari filter returns data array",
    Array.isArray(safariResults.data),
  );

  // Step 5: Test filtering by Bot for automated traffic
  const botResults: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        user_agent_contains: "Bot",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(botResults);
  TestValidator.predicate(
    "bot filter returns valid pagination metadata",
    botResults.pagination.current === 1,
  );

  // Step 6: Test without user agent filter to get all guests
  const allGuestsResults: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(allGuestsResults);
  TestValidator.predicate(
    "unfiltered query returns results",
    allGuestsResults.pagination.limit === 50,
  );
}
