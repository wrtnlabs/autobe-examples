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
 * Tests filtering ban appeals by review status (pending, approved, rejected).
 *
 * This test validates that moderators can filter ban appeals by their status
 * and that the filtering works correctly. It verifies:
 *
 * - Pending appeals have no moderator response
 * - Approved/rejected appeals include moderator decisions
 * - Status filtering returns only matching appeals
 */
export async function test_api_ban_appeal_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "testPassword123",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Fetch all ban appeals without filtering
  const allAppeals: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(allAppeals);

  // Step 3: Test filtering by "pending" status
  const pendingAppeals: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          status: "pending",
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(pendingAppeals);

  // Verify all returned appeals have "pending" status
  for (const appeal of pendingAppeals.data) {
    TestValidator.equals(
      "pending appeal has pending status",
      appeal.status,
      "pending",
    );

    // Pending appeals should have no moderator response
    TestValidator.predicate(
      "pending appeal has no moderator response",
      appeal.moderator_response === null ||
        appeal.moderator_response === undefined,
    );
  }

  // Step 4: Test filtering by "approved" status
  const approvedAppeals: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          status: "approved",
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(approvedAppeals);

  // Verify all returned appeals have "approved" status
  for (const appeal of approvedAppeals.data) {
    TestValidator.equals(
      "approved appeal has approved status",
      appeal.status,
      "approved",
    );

    // Approved appeals should have moderator response
    TestValidator.predicate(
      "approved appeal has moderator response",
      appeal.moderator_response !== null &&
        appeal.moderator_response !== undefined,
    );
  }

  // Step 5: Test filtering by "rejected" status
  const rejectedAppeals: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          status: "rejected",
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(rejectedAppeals);

  // Verify all returned appeals have "rejected" status (note: DTO uses "denied")
  for (const appeal of rejectedAppeals.data) {
    TestValidator.equals(
      "rejected appeal has denied status",
      appeal.status,
      "denied",
    );

    // Rejected appeals should have moderator response
    TestValidator.predicate(
      "rejected appeal has moderator response",
      appeal.moderator_response !== null &&
        appeal.moderator_response !== undefined,
    );
  }

  // Step 6: Verify total counts add up correctly
  const pendingCount = pendingAppeals.pagination.records;
  const approvedCount = approvedAppeals.pagination.records;
  const rejectedCount = rejectedAppeals.pagination.records;
  const totalFilteredCount = pendingCount + approvedCount + rejectedCount;

  TestValidator.predicate(
    "filtered counts should not exceed total appeals",
    totalFilteredCount <= allAppeals.pagination.records,
  );
}
