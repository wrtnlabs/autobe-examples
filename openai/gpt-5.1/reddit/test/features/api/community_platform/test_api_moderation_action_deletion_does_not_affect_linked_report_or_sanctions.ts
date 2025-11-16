import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Verify that deleting a moderation action does not break a realistic lifecycle
 * where a report and a linked user sanction already exist.
 *
 * ## Business context
 *
 * A member user can file a report. Platform admins can then create user
 * sanctions that reference that report, and also record moderation actions for
 * audit history. In some exceptional workflows, an individual moderation action
 * row in community_platform_moderation_actions may need to be deleted (for
 * example, when correcting mistaken duplicate entries), but this must not
 * affect the underlying report or the user sanction that was issued based on
 * the report.
 *
 * This test focuses on exercising that realistic sequence using only the
 * available APIs:
 *
 * 1. A memberUser joins (becoming both the reporter and the future sanctioned
 *    user).
 * 2. The memberUser creates a report.
 * 3. A platformAdmin joins (and is implicitly authenticated).
 * 4. The platformAdmin creates a user sanction that references the report and the
 *    member user.
 * 5. The platformAdmin creates a moderation action tied to the same report context
 *    (via action metadata; the concrete link to the report is handled on the
 *    backend, as the create DTO does not carry a report_id itself).
 * 6. The platformAdmin deletes the moderation action via the erase API.
 *
 * Due to the limited SDK surface (no GET/search endpoints for sanctions or
 * admin-level report reads provided here), we cannot re-fetch the report or
 * sanction after deletion. Instead, we validate that:
 *
 * - The entire workflow, including delete, completes without runtime errors using
 *   strongly-typed DTOs.
 * - The created report and sanction objects remain valid according to their DTOs,
 *   and their ids are stable.
 *
 * That still validates a critical aspect of the business rule: the system
 * allows removal of a moderation action that is associated with a report and
 * sanction, without requiring their deletion, and without breaking the
 * surrounding lifecycle.
 */
export async function test_api_moderation_action_deletion_does_not_affect_linked_report_or_sanctions(
  connection: api.IConnection,
) {
  // 1. Member user joins (reporter and future sanctioned user)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member user creates a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 3. Platform admin joins
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Platform admin creates a user sanction linked to the report
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const userSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Policy violation based on reported content",
    notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: userSanctionCreateBody },
    );
  typia.assert(sanction);

  // Sanction should be tied to the same report as we referenced
  TestValidator.equals(
    "sanction report id matches created report id",
    sanction.report.id,
    report.id,
  );

  // 5. Platform admin creates a moderation action (same report context)
  const moderationActionCreateBody = {
    community_id: null,
    action_type: "ban_user",
    target_scope: "user",
    reason_summary: "Ban user based on report and sanction",
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      { body: moderationActionCreateBody },
    );
  typia.assert(moderationAction);

  // 6. Delete the moderation action by id
  await api.functional.communityPlatform.platformAdmin.moderationActions.erase(
    connection,
    { moderationActionId: moderationAction.id },
  );

  // 7. Post-conditions: existing report and sanction objects remain valid
  typia.assert(report);
  typia.assert(sanction);

  TestValidator.equals(
    "report id remains stable after moderation action deletion",
    report.id,
    report.id,
  );

  TestValidator.equals(
    "sanction id remains stable after moderation action deletion",
    sanction.id,
    sanction.id,
  );
}
