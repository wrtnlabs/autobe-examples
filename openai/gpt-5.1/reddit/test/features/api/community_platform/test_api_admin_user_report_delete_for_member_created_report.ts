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

export async function test_api_admin_user_report_delete_for_member_created_report(
  connection: api.IConnection,
) {
  // 1. Create the reported member user (the account being reported)
  const reportedJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const reportedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reportedJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reportedMember);

  // 2. Create the reporter member user (who will file the report)
  const reporterJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const reporterMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reporterJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reporterMember);

  // 3. Reporter member creates a user report against the reported member
  const createReportBody = {
    reported_memberuser_id: reportedMember.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    status: "open",
    severity: "high",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const createdReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: createReportBody,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(createdReport);

  TestValidator.equals(
    "created report should target the expected reported member user",
    createdReport.reported_memberuser_id,
    reportedMember.id,
  );

  TestValidator.equals(
    "created report should have the initial status 'open'",
    createdReport.status,
    "open",
  );

  const userReportId: string & tags.Format<"uuid"> = createdReport.id;

  // 4. Create an adminUser (admin actor)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 5. As adminUser, fetch the report via admin detail endpoint to confirm visibility
  const fetchedBeforeDelete: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.at(
      connection,
      {
        userReportId,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(fetchedBeforeDelete);

  TestValidator.equals(
    "admin detail fetch should return the same report id before deletion",
    fetchedBeforeDelete.id,
    createdReport.id,
  );

  // 6. As adminUser, delete the report
  await api.functional.communityPlatform.adminUser.userReports.erase(
    connection,
    {
      userReportId,
    },
  );

  // 7. Verify via listing that the deleted report no longer appears
  const indexRequestBody = {
    page: 1 as number,
    limit: 20 as number,
    status: "open",
    reported_memberuser_id: reportedMember.id,
  } satisfies ICommunityPlatformUserReport.IRequest;

  const indexResult: IPageICommunityPlatformUserReport.ISummary =
    await api.functional.communityPlatform.adminUser.userReports.index(
      connection,
      {
        body: indexRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformUserReport.ISummary>(indexResult);

  const existsAfterDelete = indexResult.data.some(
    (summary) => summary.id === userReportId,
  );

  TestValidator.predicate(
    "deleted user report should not appear in admin index listing after deletion",
    existsAfterDelete === false,
  );
}
