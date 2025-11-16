import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_moderator_report_status_update_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register member user (reporter)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: "member-password-1234",
    href: "https://example.com/join/member",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. (Optional) login as member to ensure login works and token is set
  const memberLoginBody = {
    identifier: memberEmail,
    password: "member-password-1234",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // 3. Register platform admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: "platform-admin-password-1234",
    displayName: RandomGenerator.name(2),
    href: "https://example.com/join/admin",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 4. Create report reason category as platform admin
  const reasonCode = RandomGenerator.alphabets(8);
  const reasonCreateBody = {
    code: reasonCode,
    name: "Harassment",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(reasonCategory);

  // 5. Switch back to member user (login again to reset Authorization)
  const memberLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAgain);

  // 6. Member creates a report
  const initialSeverity = "low";
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: null,
    severity: initialSeverity,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(createdReport);

  const originalReportId = createdReport.id;
  const originalStatus = createdReport.status;
  const originalSeverity = createdReport.severity ?? null;
  const originalCreatedAt = createdReport.created_at;
  const originalUpdatedAt = createdReport.updated_at;

  // Ensure the report is linked to the reason category we created when present
  if (createdReport.reason_category !== undefined) {
    TestValidator.equals(
      "created report reason_category.id should match created category.id",
      createdReport.reason_category.id,
      reasonCategory.id,
    );
  }

  // 7. Register community moderator
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: "moderator-password-1234",
    display_name: RandomGenerator.name(2),
    href: "https://example.com/join/moderator",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // 8. As community moderator, update report status and severity
  const newStatus = "under_review";
  const newSeverity = "high";
  const reportUpdateBody = {
    status: newStatus,
    severity: newSeverity,
  } satisfies ICommunityPlatformReport.IUpdate;

  const updatedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.communityModerator.reports.update(
      connection,
      {
        reportId: originalReportId,
        body: reportUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(updatedReport);

  // 9. Validate updated report invariants
  TestValidator.equals(
    "report id remains unchanged after moderator update",
    updatedReport.id,
    originalReportId,
  );

  TestValidator.equals(
    "created_at remains unchanged after moderator update",
    updatedReport.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "status should be updated to new status",
    updatedReport.status,
    newStatus,
  );

  TestValidator.equals(
    "severity should be updated to new severity",
    updatedReport.severity ?? null,
    newSeverity,
  );

  // updated_at should be greater than or equal to originalUpdatedAt lexicographically (ISO timestamps)
  TestValidator.predicate(
    "updated_at should be same or later than original updated_at",
    updatedReport.updated_at >= originalUpdatedAt,
  );

  // 10. Verify that a regular member cannot update report via moderator endpoint
  const memberLoginForForbidden: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    memberLoginForForbidden,
  );

  await TestValidator.error(
    "member user must not be able to call moderator report update endpoint",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.update(
        connection,
        {
          reportId: originalReportId,
          body: {
            status: "resolved_no_action",
          } satisfies ICommunityPlatformReport.IUpdate,
        },
      );
    },
  );
}
