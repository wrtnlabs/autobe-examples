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
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfUsers";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformReportUserReportedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserReportedUser";
import type { ICommunityPlatformReportUserReporter } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserReporter";
import type { ICommunityPlatformReportUserTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserTarget";

export async function test_api_moderator_view_report_user_context_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a community moderator (this also authenticates and sets Authorization)
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPwd123!";

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: null,
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 2. Register a member user (this also authenticates and sets Authorization)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPwd123!";

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. (Optional) Explicit member login to ensure session and token behavior
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  TestValidator.equals(
    "login member id should equal joined member id",
    memberLoginAuthorized.id,
    memberAuthorized.id,
  );

  // 4. As the member user, create a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  TestValidator.equals(
    "created report reporter_type should match input",
    createdReport.reporter_type,
    reportCreateBody.reporter_type,
  );

  // 5. Switch authentication to moderator explicitly (login)
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  TestValidator.equals(
    "login moderator id should equal joined moderator id",
    moderatorLoginAuthorized.id,
    moderatorAuthorized.id,
  );

  // 6. As moderator, create a moderation action attached to the report
  const moderationActionCreateBody = {
    community_id: null,
    action_type: "no_action",
    target_scope: "user",
    reason_summary: "Initial triage: no action required",
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId: createdReport.id,
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  TestValidator.equals(
    "moderation action should be linked to created report",
    moderationAction.community_platform_report_id,
    createdReport.id,
  );

  TestValidator.equals(
    "moderation action action_type should match input",
    moderationAction.action_type,
    moderationActionCreateBody.action_type,
  );

  // 7. As moderator, fetch the user-focused report view
  const userReportView: ICommunityPlatformReportOfUsers =
    await api.functional.communityPlatform.communityModerator.reports.user.at(
      connection,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert(userReportView);

  // 8. Business-level assertions on the user-focused report view
  TestValidator.equals(
    "user-focused report id should match created report id",
    userReportView.id,
    createdReport.id,
  );

  TestValidator.predicate(
    "status should be a non-empty string",
    userReportView.status.length > 0,
  );

  TestValidator.predicate(
    "targetScope should be a non-empty string",
    userReportView.targetScope.length > 0,
  );

  TestValidator.predicate(
    "reasonCategory should be a non-empty string",
    userReportView.reasonCategory.length > 0,
  );

  TestValidator.predicate(
    "reporter displayName should be non-empty",
    userReportView.reporter.displayName.length > 0,
  );

  TestValidator.predicate(
    "reporter actorType should be non-empty",
    userReportView.reporter.actorType.length > 0,
  );

  TestValidator.predicate(
    "target.scope should be non-empty",
    userReportView.target.scope.length > 0,
  );

  TestValidator.predicate(
    "target.id should be non-empty",
    userReportView.target.id.length > 0,
  );

  // reportedUser may be null or defined depending on the underlying target,
  // so only check consistency when it is populated
  if (
    userReportView.reportedUser !== null &&
    userReportView.reportedUser !== undefined
  ) {
    TestValidator.predicate(
      "reportedUser.displayName should be non-empty when present",
      userReportView.reportedUser.displayName.length > 0,
    );
    TestValidator.predicate(
      "reportedUser.actorType should be non-empty when present",
      userReportView.reportedUser.actorType.length > 0,
    );
  }

  // 9. Negative path: ensure unauthenticated access is rejected
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to moderator user report view should fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.user.at(
        unauthenticatedConnection,
        {
          reportId: createdReport.id,
        },
      );
    },
  );
}
