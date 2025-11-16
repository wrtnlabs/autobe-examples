import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that a platform administrator can update workflow-related fields of
 * an existing community report while immutable fields remain unchanged.
 *
 * Business flow:
 *
 * 1. Admin joins (registers) and becomes authenticated as platformAdmin.
 * 2. Admin creates a report reason category that will be used as the report's
 *    reason.
 * 3. Member user joins and becomes authenticated as memberUser.
 * 4. Member user submits a report referencing the created reason category.
 * 5. Switch authentication back to the platform admin via login.
 * 6. Platform admin updates the report's workflow fields (status, severity, reason
 *    category id, description) using the admin update endpoint.
 * 7. Validate that mutable fields have changed as requested and that immutable
 *    fields (id, reporter_type, created_at) remain unchanged.
 */
export async function test_api_platform_admin_updates_report_workflow_fields(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: adminEmail,
        password: adminPassword,
        displayName: RandomGenerator.name(),
        ip: RandomGenerator.alphaNumeric(10),
        href: adminJoinHref,
        referrer: adminJoinReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a report reason category
  const reasonCategoryCode = `harassment_${RandomGenerator.alphaNumeric(6)}`;
  const reasonCategoryCreateBody = {
    code: reasonCategoryCode,
    name: "Harassment",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCategoryCreateBody,
      },
    );
  typia.assert(reasonCategory);

  // 3. Member user joins
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const memberJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberEmail,
        password: memberPassword,
        ip: RandomGenerator.alphaNumeric(10),
        href: memberJoinHref,
        referrer: memberJoinReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 4. Member submits a report referencing the reason category
  const initialSeverity = "low";
  const initialDescription = RandomGenerator.paragraph({ sentences: 6 });

  const createReportBody = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: null,
    severity: initialSeverity,
    description: initialDescription,
  } satisfies ICommunityPlatformReport.ICreate;

  const initialReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: createReportBody,
      },
    );
  typia.assert(initialReport);

  // Capture immutable fields for later validation
  const initialReportId = initialReport.id;
  const initialReporterType = initialReport.reporter_type;
  const initialCreatedAt = initialReport.created_at;
  const initialStatus = initialReport.status;
  const initialReportSeverity = initialReport.severity ?? null;
  const initialReportDescription =
    initialReport.description !== undefined &&
    initialReport.description !== null
      ? initialReport.description
      : null;

  // 5. Switch context back to platform admin via login
  const adminLoginHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminLoginReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminReAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: adminEmail,
        password: adminPassword,
        ip: RandomGenerator.alphaNumeric(10),
        href: adminLoginHref,
        referrer: adminLoginReferrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(adminReAuth);

  // 6. Platform admin updates the report's workflow fields
  const updatedStatus = "under_review";
  const updatedSeverity = "high";
  const moderatorNotes = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    status: updatedStatus,
    severity: updatedSeverity,
    report_reason_category_id: reasonCategory.id,
    community_id: null,
    description: moderatorNotes,
  } satisfies ICommunityPlatformReport.IUpdate;

  const updatedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.platformAdmin.reports.update(
      connection,
      {
        reportId: initialReportId,
        body: updateBody,
      },
    );
  typia.assert(updatedReport);

  // 7. Validate immutable and mutable fields
  // Immutable fields
  TestValidator.equals(
    "report id remains unchanged after admin update",
    updatedReport.id,
    initialReportId,
  );
  TestValidator.equals(
    "reporter_type remains unchanged after admin update",
    updatedReport.reporter_type,
    initialReporterType,
  );
  TestValidator.equals(
    "created_at remains unchanged after admin update",
    updatedReport.created_at,
    initialCreatedAt,
  );

  // Mutable workflow fields: ensure they changed as requested
  TestValidator.equals(
    "status updated to new value by platform admin",
    updatedReport.status,
    updatedStatus,
  );
  TestValidator.notEquals(
    "status differs from initial value after update",
    updatedReport.status,
    initialStatus,
  );

  const updatedSeverityActual =
    updatedReport.severity !== undefined && updatedReport.severity !== null
      ? updatedReport.severity
      : null;
  TestValidator.equals(
    "severity updated to new value by platform admin",
    updatedSeverityActual,
    updatedSeverity,
  );
  TestValidator.notEquals(
    "severity differs from initial severity after update",
    updatedSeverityActual,
    initialReportSeverity,
  );

  const updatedDescriptionActual =
    updatedReport.description !== undefined &&
    updatedReport.description !== null
      ? updatedReport.description
      : null;
  TestValidator.equals(
    "description updated with moderator notes",
    updatedDescriptionActual,
    moderatorNotes,
  );
  TestValidator.notEquals(
    "description differs from initial description after update",
    updatedDescriptionActual,
    initialReportDescription,
  );

  // Reason category referential integrity
  if (updatedReport.reason_category !== undefined) {
    typia.assert(updatedReport.reason_category);
    TestValidator.equals(
      "reason category id remains linked to created category",
      updatedReport.reason_category.id,
      reasonCategory.id,
    );
  }

  // Community context should remain null as we always used null
  TestValidator.equals(
    "context_community remains null after update when community_id was null",
    updatedReport.context_community ?? null,
    null,
  );
}
