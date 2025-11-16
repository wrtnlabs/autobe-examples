import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * End-to-end: platform admin resolves an appeal with outcome and resolution
 * metadata.
 *
 * This scenario simulates a realistic multi-actor moderation workflow:
 *
 * 1. A member user joins the platform and files a moderation report.
 * 2. A second member user (who will later be sanctioned) joins the platform.
 * 3. A community moderator joins and records a moderation action.
 * 4. A platform administrator joins and creates a user sanction based on the
 *    report and the sanctioned member.
 * 5. The sanctioned member user submits an appeal against the sanction.
 * 6. The platform administrator updates the appeal to a terminal status (for
 *    example, "accepted"), populating outcome_summary and resolved_at.
 * 7. The test verifies that:
 *
 *    - Appeal_status reflects the requested terminal state,
 *    - Resolved_at becomes non-null,
 *    - Outcome_summary is persisted as sent,
 *    - Created_at remains unchanged while updated_at advances,
 *    - Associations to the motivating report (and, when present, userSanction)
 *         remain stable between creation and update.
 */
export async function test_api_platform_admin_updates_appeal_to_resolved_with_outcome(
  connection: api.IConnection,
) {
  // 1. Member user who will file the report
  const reportingMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        ip: null,
        href: "https://client.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://client.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(reportingMember);

  // 2. Member files a moderation report
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(report);

  // 3. Second member user who will be sanctioned
  const sanctionedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        ip: null,
        href: "https://client.example.com/join-sanctioned" as string &
          tags.Format<"uri">,
        referrer: "https://client.example.com/campaign" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(sanctionedMember);

  // 4. Community moderator joins and records a moderation action
  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(2),
        ip: null,
        href: "https://client.example.com/mod/join" as string &
          tags.Format<"uri">,
        referrer: "https://client.example.com/mod" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderator);

  const moderationActionBody = {
    community_id: null,
    action_type: "content_review",
    target_scope: "user",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationActionBody },
    );
  typia.assert(moderationAction);

  // 5. Platform admin joins and creates a user sanction based on the report
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(2),
        ip: undefined,
        href: "https://admin.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://admin.example.com" as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdmin);

  const now: Date = new Date();
  const effectiveFrom: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;
  const effectiveUntilDate: Date = new Date(now.getTime() + 60 * 60 * 1000);
  const effectiveUntil: string & tags.Format<"date-time"> =
    effectiveUntilDate.toISOString() as string & tags.Format<"date-time">;

  const sanctionBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: sanctionedMember.id,
    community_id: null,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const userSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: sanctionBody },
    );
  typia.assert(userSanction);

  // 6. Sanctioned member submits an appeal against the sanction
  // (We rely on backend logic to associate appeal to the correct sanction/report.)
  const appealCreateBody = {
    appeal_scope: "sanction",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      { body: appealCreateBody },
    );
  typia.assert(createdAppeal);

  const originalCreatedAt: string & tags.Format<"date-time"> =
    createdAppeal.created_at;
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    createdAppeal.updated_at;

  // 7. Platform admin resolves the appeal to a terminal status with outcome
  const resolvedAtDate: Date = new Date();
  const resolvedAt: string & tags.Format<"date-time"> =
    resolvedAtDate.toISOString() as string & tags.Format<"date-time">;
  const terminalStatus: string = "accepted";
  const updatedReasonSummary: string = RandomGenerator.paragraph({
    sentences: 2,
  });
  const updatedDetails: string = RandomGenerator.paragraph({ sentences: 6 });
  const outcomeSummary: string = "sanction_reduced";

  const updateBody: ICommunityPlatformAppeal.IUpdate = {
    appeal_status: terminalStatus,
    appeal_scope: "sanction",
    reason_summary: updatedReasonSummary,
    details: updatedDetails,
    outcome_summary: outcomeSummary,
    resolved_at: resolvedAt,
  };

  const updatedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.platformAdmin.appeals.update(
      connection,
      {
        appealId: createdAppeal.id as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updatedAppeal);

  // 8. Business validations
  TestValidator.equals(
    "appeal status updated to terminal state",
    updatedAppeal.appeal_status,
    terminalStatus,
  );

  TestValidator.predicate(
    "resolved_at is non-null after resolution",
    updatedAppeal.resolved_at !== undefined &&
      updatedAppeal.resolved_at !== null,
  );

  TestValidator.equals(
    "outcome_summary persisted",
    updatedAppeal.outcome_summary ?? null,
    outcomeSummary,
  );

  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedAppeal.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at should advance after update",
    updatedAppeal.updated_at,
    originalUpdatedAt,
  );

  TestValidator.equals(
    "report association preserved on appeal",
    updatedAppeal.report.id,
    createdAppeal.report.id,
  );

  if (createdAppeal.userSanction && updatedAppeal.userSanction) {
    TestValidator.equals(
      "user sanction association preserved on appeal",
      updatedAppeal.userSanction.id,
      createdAppeal.userSanction.id,
    );
  }
}
