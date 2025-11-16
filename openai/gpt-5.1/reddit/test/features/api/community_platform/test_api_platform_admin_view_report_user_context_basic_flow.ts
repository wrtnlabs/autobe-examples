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
import type { ICommunityPlatformReportOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfUsers";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformReportUserReportedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserReportedUser";
import type { ICommunityPlatformReportUserReporter } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserReporter";
import type { ICommunityPlatformReportUserTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserTarget";

export async function test_api_platform_admin_view_report_user_context_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (memberUser actor)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. As the member user, create a new report via memberUser endpoint
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(createdReport);

  // 3. Register and authenticate a platform administrator, switching actor
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 4. As platformAdmin, fetch the user-focused view of the report
  const reportOfUsers: ICommunityPlatformReportOfUsers =
    await api.functional.communityPlatform.platformAdmin.reports.user.at(
      connection,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert<ICommunityPlatformReportOfUsers>(reportOfUsers);

  // 5. Basic identity alignment checks
  TestValidator.equals(
    "report id in user view must match created report id",
    reportOfUsers.id,
    createdReport.id,
  );

  // We cannot assert exact status value, but it must be a non-empty string
  TestValidator.predicate(
    "report status in user view must be non-empty",
    reportOfUsers.status.length > 0,
  );

  // targetScope and reasonCategory should both be non-empty strings
  TestValidator.predicate(
    "targetScope must be a non-empty string",
    reportOfUsers.targetScope.length > 0,
  );

  TestValidator.predicate(
    "reasonCategory must be a non-empty string",
    reportOfUsers.reasonCategory.length > 0,
  );

  // 6. Reporter context validation
  const reporter: ICommunityPlatformReportUserReporter = reportOfUsers.reporter;
  TestValidator.predicate(
    "reporter id must be a non-empty string",
    reporter.id.length > 0,
  );
  TestValidator.predicate(
    "reporter displayName must be a non-empty string",
    reporter.displayName.length > 0,
  );
  TestValidator.predicate(
    "reporter actorType must be a non-empty string",
    reporter.actorType.length > 0,
  );

  // 7. Reported user context validation (optional)
  const reportedUser:
    | ICommunityPlatformReportUserReportedUser
    | null
    | undefined = reportOfUsers.reportedUser;

  if (reportedUser !== null && reportedUser !== undefined) {
    TestValidator.predicate(
      "reportedUser id must be a non-empty string when present",
      reportedUser.id.length > 0,
    );
    TestValidator.predicate(
      "reportedUser displayName must be a non-empty string when present",
      reportedUser.displayName.length > 0,
    );
    TestValidator.predicate(
      "reportedUser actorType must be a non-empty string when present",
      reportedUser.actorType.length > 0,
    );
  }

  // 8. Target context validation
  const target: ICommunityPlatformReportUserTarget = reportOfUsers.target;
  TestValidator.predicate(
    "target.scope must be a non-empty string",
    target.scope.length > 0,
  );
  TestValidator.predicate(
    "target.id must be a non-empty string",
    target.id.length > 0,
  );

  // title is optional; when present, it should be non-empty
  if (target.title !== undefined) {
    TestValidator.predicate(
      "target.title, when defined, must be a non-empty string",
      target.title.length > 0,
    );
  }
}
