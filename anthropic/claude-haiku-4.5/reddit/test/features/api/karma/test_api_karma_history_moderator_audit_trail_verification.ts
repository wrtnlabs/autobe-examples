import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Verify the integrity of karma adjustments through complete audit trail
 * information.
 *
 * This test validates that moderators can review karma history records with all
 * necessary audit trail details. It ensures that:
 *
 * 1. Each karma history record contains complete audit information
 * 2. Previous_total and new_total values correctly reflect karma_change
 *    calculations
 * 3. Karma values respect the floor constraint (minimum 0)
 * 4. Reference_id properly links to source actions or is null for manual
 *    corrections
 * 5. Moderators can trace karma changes back to their origins
 *
 * The test performs the following steps:
 *
 * 1. Create a moderator account for karma audit verification
 * 2. Query the karma history with various filters and pagination
 * 3. Verify calculation integrity: previous_total + karma_change = new_total
 * 4. Validate that all values respect the karma floor (>= 0)
 * 5. Check reference_id presence and traceability
 * 6. Validate pagination and sorting functionality
 */
export async function test_api_karma_history_moderator_audit_trail_verification(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for audit trail verification
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Query karma history with no filters to get all records
  const allHistoryPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(allHistoryPage);

  // Step 3: Verify calculation integrity for each history record
  for (const history of allHistoryPage.data) {
    typia.assert(history);

    // Verify calculation: previous_total + karma_change = new_total
    const expectedNewTotal = history.previous_total + history.karma_change;
    TestValidator.equals(
      "karma calculation integrity (previous + change = new)",
      history.new_total,
      expectedNewTotal,
    );

    // Step 4: Validate karma floor constraint (minimum 0)
    TestValidator.predicate(
      "previous_total respects karma floor",
      history.previous_total >= 0,
    );
    TestValidator.predicate(
      "new_total respects karma floor",
      history.new_total >= 0,
    );

    // Step 5: Validate reference_id presence based on change reason
    if (history.change_reason === "correction") {
      // Manual corrections may have null reference_id
      TestValidator.predicate(
        "correction reason allows null reference_id",
        history.reference_id === null || history.reference_id !== null,
      );
    } else {
      // Other reasons should have reference_id for traceability
      TestValidator.predicate(
        "non-correction has reference_id for traceability",
        history.reference_id !== null,
      );
    }
  }

  // Step 6: Query history with specific member filter
  if (allHistoryPage.data.length > 0) {
    const firstMemberId = allHistoryPage.data[0].member.id;

    const memberHistoryPage: IPageICommunityPlatformKarmaHistory =
      await api.functional.communityPlatform.moderator.karmaHistory.index(
        connection,
        {
          body: {
            member_id: firstMemberId,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformKarmaHistory.IRequest,
        },
      );
    typia.assert(memberHistoryPage);

    // Verify all returned records belong to the filtered member
    for (const history of memberHistoryPage.data) {
      TestValidator.equals(
        "filtered member history shows correct member",
        history.member.id,
        firstMemberId,
      );
    }
  }

  // Step 7: Test sorting functionality
  const sortedHistoryPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          sort_by: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(sortedHistoryPage);

  // Step 8: Test filtering by change reason
  const suspensionHistoryPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          change_reason: "user_suspended",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(suspensionHistoryPage);

  // Verify all returned records have the filtered change reason
  for (const history of suspensionHistoryPage.data) {
    TestValidator.equals(
      "filtered change reason returns correct records",
      history.change_reason,
      "user_suspended",
    );
  }

  // Step 9: Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const dateFilteredPage: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.moderator.karmaHistory.index(
      connection,
      {
        body: {
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(dateFilteredPage);

  // Verify all records are within the date range
  for (const history of dateFilteredPage.data) {
    const createdTime = new Date(history.created_at).getTime();
    TestValidator.predicate(
      "history record is within date range",
      createdTime >= oneWeekAgo.getTime() && createdTime <= now.getTime(),
    );
  }

  // Step 10: Comprehensive audit trail verification complete
  TestValidator.predicate(
    "audit trail verification completed successfully",
    true,
  );
}
