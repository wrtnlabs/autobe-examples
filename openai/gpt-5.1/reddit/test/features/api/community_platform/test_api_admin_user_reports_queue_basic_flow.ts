import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserReport";

export async function test_api_admin_user_reports_queue_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain an authorized context
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.test`;
  const adminPassword = "AdminPassw0rd!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Register a memberUser and authenticate as that member
  const memberUsername = RandomGenerator.name(1);
  const memberEmail = `${RandomGenerator.alphabets(8)}@member.test`;
  const memberPassword = "MemberPassw0rd!";
  const href = "https://community.test/join" as string & tags.Format<"uri">;
  const referrer = "https://community.test/landing" as string &
    tags.Format<"uri">;

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create a user report against the same member account
  const memberReportBody = {
    reported_memberuser_id: memberAuthorized.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    severity: "high",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const memberReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      { body: memberReportBody },
    );
  typia.assert(memberReport);

  // 4. Switch back to adminUser context via login
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 5. As adminUser, create an additional user report against the same member
  const adminReportBody = {
    reported_memberuser_id: memberAuthorized.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    status: "open",
    severity: "medium",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const adminReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.create(
      connection,
      { body: adminReportBody },
    );
  typia.assert(adminReport);

  // 6. As adminUser, retrieve the user reports queue with a basic filter
  const page = 1;
  const limit = 10;

  const queueRequestBody = {
    page,
    limit,
  } satisfies ICommunityPlatformUserReport.IRequest;

  const queuePage: IPageICommunityPlatformUserReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.user.index(
      connection,
      { body: queueRequestBody },
    );
  typia.assert(queuePage);

  // 7. Validate pagination metadata and presence of created reports
  TestValidator.equals(
    "queue pagination current page",
    queuePage.pagination.current,
    page,
  );
  TestValidator.equals(
    "queue pagination limit",
    queuePage.pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "queue records non-negative",
    () => queuePage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "queue pages non-negative",
    () => queuePage.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "queue has at least one item",
    () => queuePage.data.length >= 1,
  );

  const hasReportedMember = queuePage.data.some((summary) => {
    return summary.reportedMember.id === memberAuthorized.id;
  });

  TestValidator.predicate(
    "queue contains reports for the targeted member",
    hasReportedMember,
  );

  // 8. Verify that memberUser cannot access the admin queue endpoint
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  const memberQueueRequestBody = {
    page,
    limit,
  } satisfies ICommunityPlatformUserReport.IRequest;

  await TestValidator.error(
    "memberUser must not be able to access admin user reports queue",
    async () => {
      await api.functional.communityPlatform.adminUser.reports.queues.user.index(
        connection,
        { body: memberQueueRequestBody },
      );
    },
  );
}
