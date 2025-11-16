import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test viewing karma history for a member who has been banned from the
 * platform.
 *
 * This test validates that when a member receives a permanent ban, the karma
 * history correctly records the ban penalty adjustment. The test creates a
 * complete moderation workflow: member registration, moderator assignment, ban
 * record creation, and karma history retrieval. It verifies that the member's
 * karma history includes an entry with change_reason 'user_banned' showing the
 * significant negative karma penalty, properly linked to the ban record via
 * reference_id.
 *
 * The test ensures karma history maintains complete audit trails of
 * disciplinary actions:
 *
 * 1. Create member account to be banned
 * 2. Create moderator account for issuing ban
 * 3. Create member ban record with permanent ban penalty
 * 4. Retrieve member's karma history
 * 5. Verify ban penalty entry appears with correct change_reason, amount, and
 *    reference
 * 6. Validate chronological ordering and audit trail integrity
 */
export async function test_api_karma_history_member_view_with_ban(
  connection: api.IConnection,
) {
  // 1. Create member account that will be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberCreate = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphabets(10),
    href: "https://example.com/auth/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const bannedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreate,
    });
  typia.assert(bannedMember);
  typia.assertGuard<ICommunityPlatformMember.IAuthorized>(bannedMember);

  // 2. Create moderator account for issuing ban
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreate = {
    email: moderatorEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphabets(10),
    href: "https://example.com/auth/moderator",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);
  typia.assertGuard<ICommunityPlatformModerator.IAuthorized>(moderator);

  // 3. Create member ban record with permanent ban penalty
  // Use a valid UUID for report decision (system would have created this)
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();
  const banReason = RandomGenerator.paragraph({ sentences: 5 });
  const appealEligibleAt = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const banCreate = {
    community_platform_member_id: bannedMember.id,
    community_platform_report_decision_id: reportDecisionId,
    ban_reason: banReason,
    appeal_eligible_at: appealEligibleAt,
  } satisfies ICommunityPlatformMemberBan.ICreate;

  const memberBan: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: banCreate,
      },
    );
  typia.assert(memberBan);
  typia.assertGuard<ICommunityPlatformMemberBan>(memberBan);

  // 4. Switch back to member context and retrieve karma history
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberCreate.password,
      href: "https://example.com/auth/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const karmaHistoryResponse: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.member.members.karmaHistory.at(
      connection,
      {
        memberId: bannedMember.id,
      },
    );
  typia.assert(karmaHistoryResponse);
  typia.assertGuard<IPageICommunityPlatformKarmaHistory>(karmaHistoryResponse);

  // 5. Verify karma history contains ban penalty entry
  const karmaHistoryData = karmaHistoryResponse.data;

  // Find the ban entry in karma history
  const banHistoryEntry = karmaHistoryData.find(
    (entry: ICommunityPlatformKarmaHistory) =>
      entry.change_reason === "user_banned",
  );

  TestValidator.predicate(
    "ban penalty entry exists in karma history",
    banHistoryEntry !== undefined,
  );

  if (banHistoryEntry) {
    typia.assertGuard<ICommunityPlatformKarmaHistory>(banHistoryEntry);

    // 6. Validate ban entry properties
    TestValidator.equals(
      "ban entry has user_banned change reason",
      banHistoryEntry.change_reason,
      "user_banned",
    );

    TestValidator.predicate(
      "ban penalty amount is negative",
      banHistoryEntry.karma_change < 0,
    );

    TestValidator.predicate(
      "ban entry has reference to ban record",
      banHistoryEntry.reference_id !== null &&
        banHistoryEntry.reference_id !== undefined,
    );

    TestValidator.equals(
      "ban reference_id matches ban record",
      banHistoryEntry.reference_id,
      memberBan.id,
    );

    TestValidator.predicate(
      "karma decreased from ban penalty",
      banHistoryEntry.new_total < banHistoryEntry.previous_total,
    );

    TestValidator.predicate(
      "new_total matches calculation",
      banHistoryEntry.new_total ===
        banHistoryEntry.previous_total + banHistoryEntry.karma_change,
    );

    TestValidator.predicate(
      "new_total is not negative",
      banHistoryEntry.new_total >= 0,
    );
  }

  // 7. Verify pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    karmaHistoryResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination has limit",
    karmaHistoryResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination has record count",
    karmaHistoryResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination has page count",
    karmaHistoryResponse.pagination.pages >= 0,
  );
}
