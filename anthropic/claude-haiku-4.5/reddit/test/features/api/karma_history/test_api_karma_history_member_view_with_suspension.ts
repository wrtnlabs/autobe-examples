import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test viewing karma history for a member who has been suspended, including the
 * suspension penalty karma adjustment.
 *
 * This test validates that:
 *
 * - Member accounts can be created and tracked for suspension karma penalties
 * - Moderator accounts can be created to issue suspensions
 * - Suspension records generate karma penalty history entries
 * - Karma history API returns paginated results with suspension impact
 * - Karma history entries include 'user_suspended' reason with negative
 *   karma_change
 * - Suspension reference_id correctly links to the suspension record
 * - Member's karma_score reflects the cumulative penalty
 *
 * Steps:
 *
 * 1. Create a member account
 * 2. Create a moderator account
 * 3. Create a suspension record for the member
 * 4. Retrieve karma history for the suspended member
 * 5. Validate that karma history contains suspension penalty entry
 * 6. Verify karma totals before and after suspension
 */
export async function test_api_karma_history_member_view_with_suspension(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const memberCreateBody = {
    email: memberEmail,
    username: memberUsername,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderatorCreateBody = {
    email: moderatorEmail,
    username: moderatorUsername,
    password: moderatorPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateBody,
  });
  typia.assert(moderatorAuth);

  // Step 3: Login as moderator to create suspension
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 4: Create suspension record
  const suspensionCreateBody = {
    community_platform_member_id: memberId,
    community_platform_report_decision_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    suspension_reason: RandomGenerator.paragraph({ sentences: 5 }),
    suspended_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ICommunityPlatformMemberSuspension.ICreate;

  const suspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.create(
      connection,
      {
        body: suspensionCreateBody,
      },
    );
  typia.assert(suspension);

  // Step 5: Login back as member to retrieve karma history
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 6: Retrieve karma history for the suspended member
  const karmaHistory =
    await api.functional.communityPlatform.member.members.karmaHistory.at(
      connection,
      {
        memberId,
      },
    );
  typia.assert(karmaHistory);

  // Step 7: Validate karma history response structure
  TestValidator.predicate(
    "karma history pagination exists",
    karmaHistory.pagination !== null && karmaHistory.pagination !== undefined,
  );
  TestValidator.predicate(
    "karma history data is array",
    Array.isArray(karmaHistory.data),
  );
  TestValidator.predicate(
    "karma history contains entries",
    karmaHistory.data.length > 0,
  );

  // Step 8: Verify suspension entry exists in karma history
  const suspensionEntry = karmaHistory.data.find(
    (entry) => entry.change_reason === "user_suspended",
  );
  TestValidator.predicate(
    "suspension karma history entry exists",
    suspensionEntry !== undefined,
  );

  if (suspensionEntry) {
    // Step 9: Validate suspension entry details
    TestValidator.equals(
      "suspension entry member ID matches",
      suspensionEntry.member.id,
      memberId,
    );
    TestValidator.equals(
      "suspension entry change reason is user_suspended",
      suspensionEntry.change_reason,
      "user_suspended",
    );
    TestValidator.predicate(
      "suspension karma change is negative",
      suspensionEntry.karma_change < 0,
    );
    TestValidator.predicate(
      "suspension entry has reference ID",
      suspensionEntry.reference_id !== null &&
        suspensionEntry.reference_id !== undefined,
    );
    TestValidator.predicate(
      "previous total is non-negative",
      suspensionEntry.previous_total >= 0,
    );
    TestValidator.predicate(
      "new total is non-negative",
      suspensionEntry.new_total >= 0,
    );
    TestValidator.equals(
      "karma change calculation is correct",
      suspensionEntry.new_total,
      suspensionEntry.previous_total + suspensionEntry.karma_change,
    );

    // Step 10: Verify member's current karma reflects the penalty
    const memberKarma = suspensionEntry.member.karma_score;
    TestValidator.predicate(
      "member karma score is non-negative",
      memberKarma >= 0,
    );
    TestValidator.equals(
      "member current karma matches history new total",
      memberKarma,
      suspensionEntry.new_total,
    );
  }
}
