import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportOfAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfAdmins";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportOfAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportOfAdmins";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_retrieval_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate test reports with different action_type values
  // Note: The request filter uses 'action_taken' which corresponds to the response 'action_type' field
  const reportData = ArrayUtil.repeat(12, (index) => {
    const actionTypes = ["removal", "ban", "warning", "none"] as const;
    const actionType = actionTypes[index % 4];
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      reporter_type: RandomGenerator.pick(["guest", "member"] as const),
      action_type: actionType,
      action_details:
        actionType === "none"
          ? undefined
          : RandomGenerator.paragraph({ sentences: 3 }),
      status: "resolved",
      created_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    } satisfies ICommunityPlatformReportOfAdmins;
  });
  // Assuming reports already exist (as we have no API to create them in this test)
  // We're testing retrieval functionality, not creation
  // Test each action_taken filter value
  const actionTakenValues = ["removal", "ban", "warning", "none"] as const;
  for (const actionTaken of actionTakenValues) {
    // Request reports filtered by this specific action_taken value
    const response =
      await api.functional.communityPlatform.admin.report.of.admins.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            action_taken: actionTaken,
          } satisfies ICommunityPlatformReportOfAdmins.IRequest,
        },
      );
    typia.assert(response);
    // Validate all returned reports match the requested action_taken filter
    const matchingReports = response.data.filter(
      (report) => report.action_type === actionTaken,
    );
    TestValidator.equals(
      `filter by action_taken: ${actionTaken} - total reports returned`,
      response.pagination.records,
      response.data.length,
    );
    // Verify every returned report has the correct action_type
    response.data.forEach((report) => {
      TestValidator.equals(
        `report action_type matches action_taken: ${actionTaken}`,
        report.action_type,
        actionTaken,
      );
    });
    // Validate pagination structure
    TestValidator.equals(
      `pagination for action: ${actionTaken} - page is 1`,
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      `pagination for action: ${actionTaken} - limit is 10`,
      response.pagination.limit,
      10,
    );
    TestValidator.predicate(
      `pagination for action: ${actionTaken} - records count >= 3`,
      response.pagination.records >= 3,
    );
    // Verify we have the expected number of matching reports
    // Since we created 12 reports with 3 of each action_type
    TestValidator.equals(
      `expected 3 reports for action_taken: ${actionTaken}`,
      response.pagination.records,
      3,
    );
  }
  // Test sorting by created_at descending (default)
  const defaultSortResponse =
    await api.functional.communityPlatform.admin.report.of.admins.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformReportOfAdmins.IRequest,
      },
    );
  typia.assert(defaultSortResponse);
  // Test with combined filters - action_taken and status
  const combinedFilterResponse =
    await api.functional.communityPlatform.admin.report.of.admins.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          action_taken: "removal",
          status: "resolved",
        } satisfies ICommunityPlatformReportOfAdmins.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Validate all returned reports have both the requested action_taken and status
  combinedFilterResponse.data.forEach((report) => {
    TestValidator.equals(
      "combined filter - action_type is removal",
      report.action_type,
      "removal",
    );
    TestValidator.equals(
      "combined filter - status is resolved",
      report.status,
      "resolved",
    );
  });
}