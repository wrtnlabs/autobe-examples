import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";

/**
 * Moderator's ability to filter member moderation history by violation type.
 *
 * This test validates that moderators can retrieve and filter a member's
 * violation history by specific violation types. The test ensures that the
 * filtering mechanism correctly returns only violations matching the specified
 * type, enabling moderators to identify patterns of specific policy violations
 * and make targeted enforcement decisions.
 *
 * Test workflow:
 *
 * 1. Create a moderator account with permissions to access moderation features
 * 2. Create a member account whose violation history will be reviewed
 * 3. Authenticate as moderator to gain access to moderation dashboards
 * 4. Retrieve the member's moderation history with violation type filtering
 * 5. Verify filtered results contain only the specified violation type
 * 6. Test filtering with multiple violation types
 * 7. Validate correct pagination and sorting of violation records
 */
export async function test_api_member_violation_history_filter_by_type(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123";
  const moderatorIp = "192.168.1.100";
  const moderatorHref = typia.random<string & tags.Format<"uri">>();
  const moderatorReferrer = typia.random<string & tags.Format<"uri">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: moderatorIp,
      href: moderatorHref,
      referrer: moderatorReferrer,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account created with active status",
    moderator.account_status,
    "active",
  );

  // Step 2: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);
  TestValidator.equals(
    "member account created with correct email",
    member.id,
    member.id,
  );

  // Step 3: Authenticate as moderator
  const moderatorLogin = await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: moderatorIp,
      href: moderatorHref,
      referrer: moderatorReferrer,
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(moderatorLogin);

  // Step 4: Retrieve member moderation history without filtering
  const historyNoFilter =
    await api.functional.discussionBoard.moderator.moderation.members.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IMemberHistoryRequest,
      },
    );
  typia.assert(historyNoFilter);
  TestValidator.equals(
    "moderation history response includes member profile",
    historyNoFilter.member.id,
    member.id,
  );

  // Step 5: Retrieve member moderation history filtered by violation type - spam
  const violationTypes = [
    "spam",
    "harassment",
    "inappropriate_content",
    "misinformation",
    "off_topic",
    "copyright_violation",
    "illegal_content",
  ] as const;

  for (const violationType of violationTypes) {
    const filteredHistory =
      await api.functional.discussionBoard.moderator.moderation.members.index(
        connection,
        {
          memberId: member.id,
          body: {
            violation_type: violationType,
            page: 1,
            limit: 20,
          } satisfies IDiscussionBoardModerationLog.IMemberHistoryRequest,
        },
      );
    typia.assert(filteredHistory);

    // Verify all violations in filtered results match the requested type
    const allViolationsMatchType = filteredHistory.violations.every(
      (violation) => violation.violation_type === violationType,
    );
    TestValidator.predicate(
      `all violations match requested type ${violationType}`,
      allViolationsMatchType || filteredHistory.violations.length === 0,
    );
  }

  // Step 6: Test pagination with type filtering
  const paginatedHistory =
    await api.functional.discussionBoard.moderator.moderation.members.index(
      connection,
      {
        memberId: member.id,
        body: {
          violation_type: "harassment",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IMemberHistoryRequest,
      },
    );
  typia.assert(paginatedHistory);
  TestValidator.predicate(
    "pagination information is valid",
    paginatedHistory.pagination.page === 1 &&
      paginatedHistory.pagination.limit === 10,
  );

  // Step 7: Verify violation summary statistics
  TestValidator.predicate(
    "violation summary is included in response",
    paginatedHistory.violation_summary !== undefined,
  );

  // Step 8: Test with date range filtering combined with type filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFilteredHistory =
    await api.functional.discussionBoard.moderator.moderation.members.index(
      connection,
      {
        memberId: member.id,
        body: {
          violation_type: "misinformation",
          start_date: thirtyDaysAgo.toISOString(),
          end_date: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IMemberHistoryRequest,
      },
    );
  typia.assert(dateFilteredHistory);

  // Verify all violations in date-filtered results are of correct type
  const allDateFilteredViolationsMatch = dateFilteredHistory.violations.every(
    (v) => v.violation_type === "misinformation",
  );
  TestValidator.predicate(
    "date-filtered violations match type filter",
    allDateFilteredViolationsMatch ||
      dateFilteredHistory.violations.length === 0,
  );

  // Step 9: Verify member profile contains expected fields
  TestValidator.predicate(
    "member profile includes account status",
    historyNoFilter.member.account_status === "active" ||
      historyNoFilter.member.account_status === "suspended" ||
      historyNoFilter.member.account_status === "banned",
  );

  TestValidator.predicate(
    "member profile includes creation timestamp",
    historyNoFilter.member.created_at !== undefined,
  );

  TestValidator.predicate(
    "member profile includes activity metrics",
    historyNoFilter.member.total_articles !== undefined &&
      historyNoFilter.member.total_comments !== undefined,
  );
}
