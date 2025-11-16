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
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

export async function test_api_moderator_updates_appeal_status_and_outcome(
  connection: api.IConnection,
) {
  // 1. Member user joins (registration) and receives initial auth context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // Optionally, perform an explicit login to simulate real client behavior
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 2. Member creates a report
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
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 3. Member creates an appeal referencing the report (association is handled by backend)
  const appealCreateBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const originalAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert(originalAppeal);

  // Capture original timestamps and immutable associations
  const originalAppealId = originalAppeal.id;
  const originalAppealUpdatedAt = new Date(originalAppeal.updated_at).getTime();
  const originalAppealCreatedAt = originalAppeal.created_at;
  const originalAppealScope = originalAppeal.appeal_scope;
  const originalAppealReportId = originalAppeal.report.id;

  // 4. Community moderator joins and logs in
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    display_name: RandomGenerator.name(1),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorizedFromJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorizedFromJoin);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthorizedFromLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthorizedFromLogin);

  // 5. Moderator updates the appeal status and outcome
  const newAppealStatus = "accepted";
  const updatedReasonSummary = `${appealCreateBody.reason_summary} (community review)`;
  const updatedDetails = `${appealCreateBody.details}\n\nModerator notes: ${RandomGenerator.paragraph({ sentences: 4 })}`;
  const outcomeSummary = "appeal accepted by community moderator";
  const resolvedAt = new Date().toISOString();

  const appealUpdateBody = {
    appeal_status: newAppealStatus,
    appeal_scope: originalAppealScope,
    reason_summary: updatedReasonSummary,
    details: updatedDetails,
    outcome_summary: outcomeSummary,
    resolved_at: resolvedAt,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const updatedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.communityModerator.appeals.update(
      connection,
      {
        appealId: originalAppealId,
        body: appealUpdateBody,
      },
    );
  typia.assert(updatedAppeal);

  // 6. Validate updated appeal state
  // Identity and association invariants
  TestValidator.equals(
    "appeal id should remain unchanged after moderator update",
    updatedAppeal.id,
    originalAppealId,
  );

  TestValidator.equals(
    "appeal should remain associated with the same report",
    updatedAppeal.report.id,
    originalAppealReportId,
  );

  // Status and scope
  TestValidator.equals(
    "appeal status should match the updated moderator status",
    updatedAppeal.appeal_status,
    newAppealStatus,
  );

  TestValidator.equals(
    "appeal scope should remain unchanged when explicitly preserved",
    updatedAppeal.appeal_scope,
    originalAppealScope,
  );

  // Narrative fields
  TestValidator.equals(
    "reason_summary should reflect moderator-updated summary",
    updatedAppeal.reason_summary ?? null,
    updatedReasonSummary,
  );

  TestValidator.equals(
    "details should reflect moderator-updated narrative",
    updatedAppeal.details ?? null,
    updatedDetails,
  );

  // Outcome: summary and resolution timestamp
  TestValidator.equals(
    "outcome_summary should be set when moving to a terminal state",
    updatedAppeal.outcome_summary ?? null,
    outcomeSummary,
  );

  TestValidator.equals(
    "resolved_at should be set when applying a final decision",
    updatedAppeal.resolved_at ?? null,
    resolvedAt,
  );

  // Timestamps: updated_at must be later than before; created_at should not change
  TestValidator.equals(
    "created_at should remain stable across updates",
    updatedAppeal.created_at,
    originalAppealCreatedAt,
  );

  const updatedAppealUpdatedAt = new Date(updatedAppeal.updated_at).getTime();
  await TestValidator.predicate(
    "updated_at should move forward after moderator update",
    async () => updatedAppealUpdatedAt > originalAppealUpdatedAt,
  );
}
