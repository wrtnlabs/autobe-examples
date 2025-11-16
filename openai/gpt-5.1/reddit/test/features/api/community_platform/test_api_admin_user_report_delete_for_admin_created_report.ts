import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserReport";

/**
 * Validate deletion lifecycle of an admin-created user report.
 *
 * Business purpose:
 *
 * - Ensure that an adminUser can delete a user report that was originally created
 *   from the admin side.
 * - Confirm that deletion is governed by admin authorization and that once
 *   deleted, the report is no longer accessible via detail or list APIs.
 *
 * Scenario steps:
 *
 * 1. Admin A joins via POST /auth/adminUser/join to obtain an authenticated admin
 *    session.
 * 2. Using admin A, create a user report via POST
 *    /communityPlatform/adminUser/userReports with a valid
 *    ICommunityPlatformUserReport.ICreate payload, capturing the created report
 *    id and reported_memberuser_id.
 * 3. Verify that the report can be fetched via GET
 *    /communityPlatform/adminUser/userReports/{userReportId} and that the
 *    returned object matches expectations.
 * 4. Delete the report via DELETE
 *    /communityPlatform/adminUser/userReports/{userReportId} using the same
 *    admin session.
 * 5. Assert that a subsequent GET on the same id results in an error, indicating
 *    the report has been removed (without asserting a specific HTTP status
 *    code).
 * 6. Optionally, query the list endpoint PATCH
 *    /communityPlatform/adminUser/userReports filtered by the
 *    reported_memberuser_id and assert that the deleted id is not present in
 *    the summary data.
 */
export async function test_api_admin_user_report_delete_for_admin_created_report(
  connection: api.IConnection,
) {
  // 1. Admin A joins and becomes authenticated
  const adminJoinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Create a user report as admin A
  const reportedMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const createReportBody = {
    reported_memberuser_id: reportedMemberId,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    status: "open",
    severity: "high",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const createdReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.create(
      connection,
      { body: createReportBody },
    );
  typia.assert(createdReport);

  // Sanity check: created report fields
  TestValidator.equals(
    "created report uses requested reported_memberuser_id",
    createdReport.reported_memberuser_id,
    reportedMemberId,
  );
  TestValidator.equals(
    "created report reason_category matches input",
    createdReport.reason_category,
    createReportBody.reason_category,
  );
  TestValidator.equals(
    "created report status matches input",
    createdReport.status,
    createReportBody.status,
  );
  TestValidator.equals(
    "created report severity matches input",
    createdReport.severity,
    createReportBody.severity,
  );

  // 3. Verify the report can be fetched via GET
  const fetchedBeforeDelete: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.at(
      connection,
      { userReportId: createdReport.id },
    );
  typia.assert(fetchedBeforeDelete);

  TestValidator.equals(
    "fetched report before deletion matches created id",
    fetchedBeforeDelete.id,
    createdReport.id,
  );

  // 4. Delete the report via DELETE
  await api.functional.communityPlatform.adminUser.userReports.erase(
    connection,
    { userReportId: createdReport.id as string & tags.Format<"uuid"> },
  );

  // 5. Subsequent GET should result in an error (not found or similar)
  await TestValidator.error(
    "getting deleted user report should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.userReports.at(
        connection,
        { userReportId: createdReport.id },
      );
    },
  );

  // 6. Optionally confirm via list endpoint that deleted id is not present
  const listAfterDelete: IPageICommunityPlatformUserReport.ISummary =
    await api.functional.communityPlatform.adminUser.userReports.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 20 as number & tags.Type<"int32">,
          reported_memberuser_id: reportedMemberId,
        } satisfies ICommunityPlatformUserReport.IRequest,
      },
    );
  typia.assert(listAfterDelete);

  const containsDeleted = listAfterDelete.data.some(
    (summary: ICommunityPlatformUserReport.ISummary) =>
      summary.id === createdReport.id,
  );

  TestValidator.predicate(
    "deleted report id should not appear in list results",
    containsDeleted === false,
  );
}
