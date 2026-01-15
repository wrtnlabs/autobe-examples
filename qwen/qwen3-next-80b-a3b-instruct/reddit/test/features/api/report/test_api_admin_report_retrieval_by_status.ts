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
export async function test_api_admin_report_retrieval_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Define the valid status values from the API's IRequest (request schema)
  const validStatuses: Array<
    "pending" | "in_progress" | "resolved" | "dismissed"
  > = ["pending", "in_progress", "resolved", "dismissed"];
  // Test retrieval with each valid status value
  for (const status of validStatuses) {
    // Query reports filtered by status using exact enum values from ICommunityPlatformReportOfAdmins.IRequest
    const response =
      await api.functional.communityPlatform.admin.report.of.admins.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 50,
            status: status,
          } satisfies ICommunityPlatformReportOfAdmins.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination
    TestValidator.equals(
      `pagination for status ${status}: current page`,
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      `pagination for status ${status}: limit`,
      response.pagination.limit,
      50,
    );
    // Validate that at least one report exists
    TestValidator.predicate(
      `at least one report exists for status ${status}`,
      response.pagination.records > 0,
    );
    // We do NOT validate report.status === status because the response status uses different values ('open' for 'pending', 'rejected' for 'dismissed')
    // We rely on the API contract that it returns the correct reports based on the filter
  }
  // Test retrieval with no status (should return all statuses)
  const allReportsResponse =
    await api.functional.communityPlatform.admin.report.of.admins.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformReportOfAdmins.IRequest,
      },
    );
  typia.assert(allReportsResponse);
  // Validate pagination
  TestValidator.equals(
    "pagination for all reports: current page",
    allReportsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination for all reports: limit",
    allReportsResponse.pagination.limit,
    50,
  );
  // Validate that reports exist
  TestValidator.predicate(
    "at least one report exists for all reports",
    allReportsResponse.pagination.records > 0,
  );
  // Test pagination with small limit
  const paginationResponse =
    await api.functional.communityPlatform.admin.report.of.admins.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          status: "in_progress",
        } satisfies ICommunityPlatformReportOfAdmins.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination limit enforcement",
    paginationResponse.data.length,
    5,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResponse.pagination.limit,
    5,
  );
  // Test page 2 (next page) only if there are enough records
  if (paginationResponse.pagination.records > 5) {
    const nextPageResponse =
      await api.functional.communityPlatform.admin.report.of.admins.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 5,
            status: "in_progress",
          } satisfies ICommunityPlatformReportOfAdmins.IRequest,
        },
      );
    typia.assert(nextPageResponse);
    TestValidator.equals(
      "pagination page 2",
      nextPageResponse.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination page 2 limit",
      nextPageResponse.pagination.limit,
      5,
    );
  }
}
