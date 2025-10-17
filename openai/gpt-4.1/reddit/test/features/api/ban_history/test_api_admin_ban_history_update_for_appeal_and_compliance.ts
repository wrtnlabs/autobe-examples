import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Validate admin's ability to update a ban history for appeal and compliance.
 *
 * This test covers the complete lifecycle: admin and member setup, moderator
 * ban issuance, report creation, and testing admin update of the ban history
 * entry, including business rule validations and edge cases (such as invalid
 * end dates on active bans and audit trail verification).
 */
export async function test_api_admin_ban_history_update_for_appeal_and_compliance(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Secretpass1!",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "Secretpass2!",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Member creates community
  const communityNameBase = RandomGenerator.alphaNumeric(12);
  const communityCreate = {
    name: communityNameBase,
    title: `${communityNameBase} Community Title`,
    description: RandomGenerator.paragraph({ sentences: 10 }),
    slug: RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);

  // 4. Member subscribes to community
  const subscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 5. Moderator registration
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  // Moderator must have joined as a member first (reuse member email for simplicity? Or register new?) For business realism, simulate a separate moderator, so register new member.
  const modMemberEmail = typia.random<string & tags.Format<"email">>();
  const modMember = await api.functional.auth.member.join(connection, {
    body: {
      email: modMemberEmail,
      password: "ModPass!3",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(modMember);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modMemberEmail,
      password: "ModPass!3",
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // 6. Admin creates report category (to be referenced from report)
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: `Abuse_${RandomGenerator.alphaNumeric(6)}`,
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // 7. Member (to be banned) files a report (simulate real violation chain)
  // Must use member account/auth
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "Secretpass2!",
    } satisfies ICommunityPlatformMember.ICreate,
  }); // Re-auth not strictly necessary; workaround if tokens/roles reset
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        report_category_id: reportCategory.id,
        reason_text: "Spam or abusive content",
        post_id: null,
        comment_id: null,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 8. Moderator issues ban referencing the report
  // Moderator must be authenticated; simulate context switch
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: modMemberEmail,
      password: "ModPass!3",
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  const now = new Date();
  const banDurationDays = 7;
  const banStart = now.toISOString();
  const banEnd = new Date(
    now.getTime() + banDurationDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const banData = {
    banned_member_id: member.id,
    issued_by_id: moderator.id,
    community_id: community.id,
    triggering_report_id: report.id,
    reason: "Violation of community guidelines: spam/abuse",
    ban_type: "temporary",
    ban_start_at: banStart,
    ban_end_at: banEnd,
    is_active: true,
  } satisfies ICommunityPlatformBanHistory.ICreate;
  const initialBan =
    await api.functional.communityPlatform.moderator.banHistories.create(
      connection,
      { body: banData },
    );
  typia.assert(initialBan);

  // 9. Admin updates the ban: a) change reason
  // Switch to admin context
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Secretpass1!",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const updateReason = "Updated after user appeal: explanation improved.";
  const banUpdate1 =
    await api.functional.communityPlatform.admin.banHistories.update(
      connection,
      {
        banHistoryId: typia.assert<string & tags.Format<"uuid">>(
          initialBan.id!,
        ),
        body: {
          reason: updateReason,
        } satisfies ICommunityPlatformBanHistory.IUpdate,
      },
    );
  typia.assert(banUpdate1);
  TestValidator.equals(
    "admin can update ban reason",
    banUpdate1.reason,
    updateReason,
  );

  // b) Grant successful appeal (set is_active: false, update reason)
  const updateAppealReason =
    "Ban revoked after successful appeal; member reinstated.";
  const banUpdate2 =
    await api.functional.communityPlatform.admin.banHistories.update(
      connection,
      {
        banHistoryId: typia.assert<string & tags.Format<"uuid">>(
          initialBan.id!,
        ),
        body: {
          is_active: false,
          reason: updateAppealReason,
        } satisfies ICommunityPlatformBanHistory.IUpdate,
      },
    );
  typia.assert(banUpdate2);
  TestValidator.equals(
    "ban is inactive after admin grants appeal",
    banUpdate2.is_active,
    false,
  );
  TestValidator.equals(
    "ban reason after appeal",
    banUpdate2.reason,
    updateAppealReason,
  );

  // c) Change ban to permanent (ban_type/permanent, ban_end_at: null)
  const banUpdate3 =
    await api.functional.communityPlatform.admin.banHistories.update(
      connection,
      {
        banHistoryId: typia.assert<string & tags.Format<"uuid">>(
          initialBan.id!,
        ),
        body: {
          ban_type: "permanent",
          ban_end_at: null,
          is_active: true,
          reason: "Permanent ban due to repeated violations.",
        } satisfies ICommunityPlatformBanHistory.IUpdate,
      },
    );
  typia.assert(banUpdate3);
  TestValidator.equals(
    "ban type changed to permanent",
    banUpdate3.ban_type,
    "permanent",
  );
  TestValidator.equals(
    "ban is_active after switching to permanent",
    banUpdate3.is_active,
    true,
  );
  TestValidator.equals(
    "ban_end_at is null for permanent ban",
    banUpdate3.ban_end_at,
    null,
  );

  // d) Attempt invalid update: mark ban as active, end date in the past (should fail business rule)
  const invalidEndDate = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  await TestValidator.error(
    "attempt to set an active ban with a past end date must fail",
    async () => {
      await api.functional.communityPlatform.admin.banHistories.update(
        connection,
        {
          banHistoryId: typia.assert<string & tags.Format<"uuid">>(
            initialBan.id!,
          ),
          body: {
            ban_type: "temporary",
            ban_end_at: invalidEndDate,
            is_active: true,
            reason: "Should fail",
          } satisfies ICommunityPlatformBanHistory.IUpdate,
        },
      );
    },
  );

  // confirm audit trail: updated_at changes, id remains safe
  const banAfterAllUpdates =
    await api.functional.communityPlatform.admin.banHistories.update(
      connection,
      {
        banHistoryId: typia.assert<string & tags.Format<"uuid">>(
          initialBan.id!,
        ),
        body: {
          reason: "Final update for audit.",
        } satisfies ICommunityPlatformBanHistory.IUpdate,
      },
    );
  typia.assert(banAfterAllUpdates);
  TestValidator.notEquals(
    "ban updated_at after changes",
    banAfterAllUpdates.updated_at,
    initialBan.updated_at,
  );
  TestValidator.equals(
    "ban id remains unchanged",
    banAfterAllUpdates.id,
    initialBan.id,
  );
}
