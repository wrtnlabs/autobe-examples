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
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfUsers";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformReportUserReportedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserReportedUser";
import type { ICommunityPlatformReportUserReporter } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserReporter";
import type { ICommunityPlatformReportUserTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserTarget";

export async function test_api_moderator_view_report_user_context_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a member user to act as the reporter
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: memberEmail,
    password: "P@ssw0rd!member",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a report as the authenticated member user
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: typia.random<string & tags.Format<"uuid">>(),
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(createdReport);

  // 3. Prepare an unauthenticated connection and verify unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated moderator report user view must fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.user.at(
        unauthConn,
        {
          reportId: createdReport.id,
        },
      );
    },
  );

  // 4. Register a community moderator (which also authenticates the connection)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: moderatorEmail,
    password: "P@ssw0rd!moderator",
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: moderatorJoinBody,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // 5. Authorized moderator access to the report user-focused view
  const reportOfUsers =
    await api.functional.communityPlatform.communityModerator.reports.user.at(
      connection,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert<ICommunityPlatformReportOfUsers>(reportOfUsers);

  // 6. Business-level validations
  TestValidator.equals(
    "reportOfUsers.id should match created report id",
    reportOfUsers.id,
    createdReport.id,
  );

  TestValidator.predicate(
    "reportOfUsers.status should be a non-empty string",
    reportOfUsers.status.length > 0,
  );

  TestValidator.predicate(
    "reportOfUsers.targetScope should be a non-empty string",
    reportOfUsers.targetScope.length > 0,
  );

  if (
    reportOfUsers.reportedUser !== null &&
    reportOfUsers.reportedUser !== undefined
  ) {
    TestValidator.predicate(
      "reportedUser.displayName should be non-empty when present",
      reportOfUsers.reportedUser.displayName.length > 0,
    );
  }
}
