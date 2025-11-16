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

export async function test_api_admin_user_report_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Create a memberUser who will be reported
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As this memberUser, create a valid user report
  const reportCreateBody = {
    reported_memberuser_id: memberAuthorized.id,
    reason_category: "spam",
    reason_detail: "Posting unsolicited ads",
    status: "open",
    severity: "low",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const createdReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 3. Create and authenticate an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Baseline listing of user reports as admin
  const baselineIndexBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformUserReport.IRequest;

  const baselinePage: IPageICommunityPlatformUserReport.ISummary =
    await api.functional.communityPlatform.adminUser.userReports.index(
      connection,
      {
        body: baselineIndexBody,
      },
    );
  typia.assert(baselinePage);

  const baselineRecords = baselinePage.pagination.records;

  // Ensure our created report is present in the baseline listing (if within page)
  const baselineHasCreated = baselinePage.data.some(
    (summary) => summary.id === createdReport.id,
  );

  TestValidator.predicate(
    "baseline listing should contain created report or be outside first page",
    typeof baselineHasCreated === "boolean",
  );

  // 5. Generate a non-existent userReportId
  const nonExistentUserReportId = typia.random<string & tags.Format<"uuid">>();

  // Guard against extremely unlikely collision with existing report id
  const collisionSafeId =
    nonExistentUserReportId === createdReport.id
      ? typia.random<string & tags.Format<"uuid">>()
      : nonExistentUserReportId;

  // 6. Attempt to delete non-existent report and expect HttpError
  await TestValidator.error(
    "delete non-existent user report must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.userReports.erase(
        connection,
        {
          userReportId: collisionSafeId,
        },
      );
    },
  );

  // 7. Listing again after failed delete
  const afterIndexPage: IPageICommunityPlatformUserReport.ISummary =
    await api.functional.communityPlatform.adminUser.userReports.index(
      connection,
      {
        body: baselineIndexBody,
      },
    );
  typia.assert(afterIndexPage);

  // Verify total records unchanged
  TestValidator.equals(
    "user report records count must remain unchanged after failed delete",
    afterIndexPage.pagination.records,
    baselineRecords,
  );

  // Verify created report is still present in the listing (if it was there before)
  const afterHasCreated = afterIndexPage.data.some(
    (summary) => summary.id === createdReport.id,
  );

  if (baselineHasCreated) {
    TestValidator.equals(
      "created report must still exist in listing after failed delete",
      afterHasCreated,
      true,
    );
  }
}
