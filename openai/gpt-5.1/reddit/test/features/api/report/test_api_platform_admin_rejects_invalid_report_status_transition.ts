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
 * Validate that platform admins cannot perform invalid status transitions on
 * reports and that failed transitions do not mutate persisted report state.
 *
 * Business flow covered by this test:
 *
 * 1. Register a platform administrator (platformAdmin.join).
 * 2. Register a member user (memberUser.join).
 * 3. As the member user, create a moderation report in its initial workflow state.
 * 4. Switch to platform admin context and perform a baseline, valid update that
 *    only changes a safe field such as severity, capturing the updated report.
 * 5. Attempt a second update that tries to set an obviously invalid status string;
 *    expect the API to reject this with a domain-level error.
 * 6. Perform another benign update/read to retrieve the latest persisted report
 *    and assert that its status and severity still match the last successfully
 *    updated values, proving transactional consistency.
 */
export async function test_api_platform_admin_rejects_invalid_report_status_transition(
  connection: api.IConnection,
) {
  // 1. Register platform admin
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinInput = {
    username: RandomGenerator.name(1),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinInput,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 3. Ensure we are in member user context (login explicitly)
  const memberLoginInput = {
    identifier: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberLoginAuthorized);

  // 4. Member user creates a report
  const createReportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: createReportBody,
      },
    );
  typia.assert(createdReport);

  // 5. Switch to platform admin context (explicit login)
  const platformAdminLoginInput = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginInput,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 6. Baseline valid update: change only severity
  const baselineUpdateBody = {
    severity: "medium",
  } satisfies ICommunityPlatformReport.IUpdate;

  const updatedReportOk: ICommunityPlatformReport =
    await api.functional.communityPlatform.platformAdmin.reports.update(
      connection,
      {
        reportId: createdReport.id,
        body: baselineUpdateBody,
      },
    );
  typia.assert(updatedReportOk);

  // 7. Invalid transition: attempt to set an obviously invalid status
  const invalidUpdateBody = {
    status: "__invalid_status__",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.IUpdate;

  await TestValidator.error(
    "platform admin invalid report status transition must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.update(
        connection,
        {
          reportId: createdReport.id,
          body: invalidUpdateBody,
        },
      );
    },
  );

  // 8. Fetch latest persisted state via another benign update (no-op or description tweak)
  const finalReadBody = {
    description: updatedReportOk.description ?? undefined,
  } satisfies ICommunityPlatformReport.IUpdate;

  const finalReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.platformAdmin.reports.update(
      connection,
      {
        reportId: createdReport.id,
        body: finalReadBody,
      },
    );
  typia.assert(finalReport);

  // 9. Assert that status and severity are unchanged from the last successful update
  TestValidator.equals(
    "report status must remain as after successful baseline update",
    finalReport.status,
    updatedReportOk.status,
  );

  TestValidator.equals(
    "report severity must remain as after successful baseline update",
    finalReport.severity ?? null,
    updatedReportOk.severity ?? null,
  );

  // Additional invariants: id and reporter_type must not change
  TestValidator.equals(
    "report id must remain stable",
    finalReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "report reporter_type must remain unchanged",
    finalReport.reporter_type,
    createdReport.reporter_type,
  );
}
