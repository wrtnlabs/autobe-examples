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

/**
 * Validate that a member user can partially update an appeal's non-status
 * fields (reason_summary/details) without changing status fields.
 *
 * Business context
 *
 * - A member user can file moderation reports and then submit appeals against
 *   decisions related to those reports.
 * - Appeals have workflow/status fields (appeal_status, resolved_at, etc.) and
 *   user-editable text fields (reason_summary, details).
 * - The PUT update endpoint must support PATCH-like behavior where omitting
 *   status-related fields keeps them unchanged while updating the provided text
 *   fields.
 *
 * Steps
 *
 * 1. Register a new member user via auth.memberUser.join to obtain an
 *    authenticated context for a member user actor.
 * 2. Create a report using communityPlatform.memberUser.reports.create with a
 *    valid ICommunityPlatformReport.ICreate payload.
 * 3. Create an appeal for that report via
 *    communityPlatform.memberUser.reports.appeals.create with
 *    ICommunityPlatformAppeal.ICreate.
 * 4. Capture the original appeal fields: id, appeal_status, appeal_scope,
 *    created_at, updated_at, resolved_at, reason_summary, details,
 *    outcome_summary.
 * 5. Call communityPlatform.memberUser.reports.appeals.update (PUT
 *    /communityPlatform/memberUser/reports/{reportId}/appeals/{appealId})
 *    providing an ICommunityPlatformAppeal.IUpdate body that sets only
 *    reason_summary and details, leaving other properties undefined.
 * 6. Validate from the update response:
 *
 *    - Appeal_status is unchanged vs original.
 *    - Appeal_scope is unchanged vs original.
 *    - Resolved_at is unchanged vs original.
 *    - Outcome_summary is unchanged vs original.
 *    - Reason_summary equals the new value.
 *    - Details equals the new value.
 *    - Updated_at is different from and later than or equal to original updated_at.
 * 7. We do not perform a separate GET because the SDK list does not expose a GET
 *    appeal endpoint; the PUT response is treated as canonical state.
 */
export async function test_api_memberuser_appeal_partial_update_details_only(
  connection: api.IConnection,
) {
  // 1. Register/join a member user to establish authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a report that this user will later appeal
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(report);

  // 3. Create an appeal for that report
  const createAppealBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: createAppealBody,
      },
    );
  typia.assert(createdAppeal);

  // Capture original fields to compare after update
  const originalStatus: string = createdAppeal.appeal_status;
  const originalScope: string = createdAppeal.appeal_scope;
  const originalResolvedAt = createdAppeal.resolved_at ?? null;
  const originalOutcomeSummary = createdAppeal.outcome_summary ?? null;
  const originalReasonSummary = createdAppeal.reason_summary ?? null;
  const originalDetails = createdAppeal.details ?? null;
  const originalUpdatedAt: string = createdAppeal.updated_at;
  const originalCreatedAt: string = createdAppeal.created_at;

  // 4. Prepare partial update that only changes reason_summary and details
  const newReasonSummary = RandomGenerator.paragraph({ sentences: 4 });
  const newDetails = RandomGenerator.content({ paragraphs: 3 });

  const updateBody = {
    reason_summary: newReasonSummary,
    details: newDetails,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const updatedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.update(
      connection,
      {
        reportId: report.id,
        appealId: createdAppeal.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAppeal);

  // 5. Validate that status-related fields are unchanged
  TestValidator.equals(
    "appeal_status remains unchanged after partial update",
    updatedAppeal.appeal_status,
    originalStatus,
  );

  TestValidator.equals(
    "appeal_scope remains unchanged after partial update",
    updatedAppeal.appeal_scope,
    originalScope,
  );

  const updatedResolvedAt = updatedAppeal.resolved_at ?? null;
  TestValidator.equals(
    "resolved_at remains unchanged after partial update",
    updatedResolvedAt,
    originalResolvedAt,
  );

  const updatedOutcomeSummary = updatedAppeal.outcome_summary ?? null;
  TestValidator.equals(
    "outcome_summary remains unchanged after partial update",
    updatedOutcomeSummary,
    originalOutcomeSummary,
  );

  // 6. Validate that only reason_summary and details are changed
  TestValidator.notEquals(
    "reason_summary should be updated to new value",
    updatedAppeal.reason_summary,
    originalReasonSummary,
  );
  TestValidator.equals(
    "reason_summary matches new value",
    updatedAppeal.reason_summary,
    newReasonSummary,
  );

  TestValidator.notEquals(
    "details should be updated to new value",
    updatedAppeal.details,
    originalDetails,
  );
  TestValidator.equals(
    "details matches new value",
    updatedAppeal.details,
    newDetails,
  );

  // 7. Validate updated_at has advanced and is not before created_at
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedAppeal.updated_at,
    originalUpdatedAt,
  );

  const originalUpdatedAtDate = new Date(originalUpdatedAt).getTime();
  const updatedUpdatedAtDate = new Date(updatedAppeal.updated_at).getTime();
  const createdAtDate = new Date(originalCreatedAt).getTime();

  TestValidator.predicate(
    "updated_at must be later than or equal to previous updated_at",
    updatedUpdatedAtDate >= originalUpdatedAtDate,
  );

  TestValidator.predicate(
    "updated_at must not be earlier than created_at",
    updatedUpdatedAtDate >= createdAtDate,
  );
}
