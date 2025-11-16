import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate that a community moderator can revoke a platform‑wide user sanction
 * associated with a specific report.
 *
 * Business flow covered by this E2E test:
 *
 * 1. A member user joins the platform and authenticates.
 * 2. The member user files a moderation report as the motivating case.
 * 3. A platform admin joins and creates a baseline platform‑admin scoped sanction
 *    (model sanity check only).
 * 4. A community moderator joins, authenticates, and creates an "active"
 *    platform‑wide user sanction for the reported member user, linked to the
 *    report.
 * 5. The same community moderator calls the update endpoint to transition the
 *    sanction from active to revoked, simultaneously shortening the
 *    effective_until timestamp and updating summary/notes fields.
 * 6. The response is validated to ensure:
 *
 *    - Id and report linkage are unchanged,
 *    - The sanctioned user remains the same,
 *    - Scope remains platform‑wide (community is null),
 *    - Status is "revoked",
 *    - Effective_until is not later than the original value,
 *    - Reason_summary and notes_internal reflect the update,
 *    - Updated_at is not earlier than created_at.
 */
export async function test_api_user_sanction_update_by_community_moderator_from_active_to_revoked_for_platform_wide_ban(
  connection: api.IConnection,
) {
  // 1. Member user joins (registration + implicit authentication)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member user creates a motivating report
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "high",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(report);

  // 3. Platform admin joins and creates a baseline platform-admin-scoped sanction
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const baselineEffectiveFrom = now.toISOString();
  const baselineEffectiveUntil = new Date(
    now.getTime() + sevenDaysMs,
  ).toISOString();

  const baselineSanctionBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: baselineEffectiveFrom,
    effective_until: baselineEffectiveUntil,
    reason_summary: "Baseline platform-admin sanction for validation",
    notes_internal:
      "Baseline sanction created by platform admin for model sanity check.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const baselineSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: baselineSanctionBody },
    );
  typia.assert(baselineSanction);

  // Basic sanity checks on baseline sanction
  TestValidator.equals(
    "baseline sanction links to report",
    baselineSanction.report.id,
    report.id,
  );
  TestValidator.equals(
    "baseline sanction links to member user",
    baselineSanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );

  // 4. Community moderator joins (registration + implicit authentication)
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 5. Community moderator creates the platform-wide sanction to be updated
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const effectiveFrom = new Date().toISOString();
  const effectiveUntilOriginal = new Date(
    Date.now() + threeDaysMs,
  ).toISOString();

  const moderatorSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntilOriginal,
    reason_summary: "Initial platform-wide temporary ban by moderator.",
    notes_internal: "Created for E2E test: active platform-wide sanction.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const originalSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: moderatorSanctionCreateBody,
      },
    );
  typia.assert(originalSanction);

  // Validate original sanction basics
  TestValidator.equals(
    "original sanction id non-empty",
    typeof originalSanction.id,
    "string",
  );
  TestValidator.equals(
    "original sanction links to report",
    originalSanction.report.id,
    report.id,
  );
  TestValidator.equals(
    "original sanction links to member user",
    originalSanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "original sanction is active",
    originalSanction.status,
    "active",
  );
  TestValidator.equals(
    "original sanction type matches",
    originalSanction.sanction_type,
    "temporary_platform_ban",
  );
  TestValidator.equals(
    "original sanction platform-wide scope",
    originalSanction.community,
    null,
  );

  const originalEffectiveUntilStr = originalSanction.effective_until ?? null;

  // 6. Moderator updates sanction: active -> revoked with shorter effective_until
  const newEffectiveUntil = new Date(Date.now() + 60 * 1000).toISOString();
  const updatedReasonSummary =
    "Sanction revoked after review; enforcement window shortened.";
  const updatedNotesInternal =
    "Moderator decided to revoke sanction early due to successful appeal.";

  const updateBody = {
    status: "revoked",
    effective_until: newEffectiveUntil,
    reason_summary: updatedReasonSummary,
    notes_internal: updatedNotesInternal,
  } satisfies ICommunityPlatformUserSanction.IUpdate;

  const updatedSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.update(
      connection,
      {
        reportId: report.id,
        userSanctionId: originalSanction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSanction);

  // 7. Business validations on updated sanction
  TestValidator.equals(
    "sanction id remains the same",
    updatedSanction.id,
    originalSanction.id,
  );
  TestValidator.equals(
    "report linkage unchanged",
    updatedSanction.report.id,
    originalSanction.report.id,
  );
  TestValidator.equals(
    "report linkage still matches motivating report",
    updatedSanction.report.id,
    report.id,
  );
  TestValidator.equals(
    "sanctioned member user unchanged",
    updatedSanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "scope still platform-wide (community null)",
    updatedSanction.community,
    null,
  );
  TestValidator.equals(
    "status transitioned to revoked",
    updatedSanction.status,
    "revoked",
  );

  // effective_until should not be later than original (when original existed)
  if (originalEffectiveUntilStr !== null && updatedSanction.effective_until) {
    const originalEffectiveUntilDate = new Date(originalEffectiveUntilStr);
    const newEffectiveUntilDate = new Date(updatedSanction.effective_until);

    TestValidator.predicate(
      "effective_until not extended beyond original",
      newEffectiveUntilDate.getTime() <= originalEffectiveUntilDate.getTime(),
    );
  }

  TestValidator.equals(
    "reason_summary updated",
    updatedSanction.reason_summary,
    updatedReasonSummary,
  );
  TestValidator.equals(
    "notes_internal updated",
    updatedSanction.notes_internal,
    updatedNotesInternal,
  );

  const createdAt = new Date(updatedSanction.created_at);
  const updatedAt = new Date(updatedSanction.updated_at);
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );
}
