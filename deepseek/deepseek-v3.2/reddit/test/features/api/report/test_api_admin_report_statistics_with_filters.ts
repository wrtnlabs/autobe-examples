import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_report_statistics_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test various filter combinations
  const testCases: ICommunityPlatformContentReport.IRequest[] = [
    // Empty filters (should return all accessible reports)
    {},
    // Date range filter
    {
      created_after: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      created_before: new Date().toISOString(),
    } satisfies ICommunityPlatformContentReport.IRequest,
    // Status filter - single status
    {
      status: ["pending"],
    } satisfies ICommunityPlatformContentReport.IRequest,
    // Status filter - multiple statuses
    {
      status: ["pending", "approved", "dismissed"],
    } satisfies ICommunityPlatformContentReport.IRequest,
    // Content type filter
    {
      content_type: "post",
    } satisfies ICommunityPlatformContentReport.IRequest,
    // Pagination test
    {
      page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    } satisfies ICommunityPlatformContentReport.IRequest,
    // Combined filters
    {
      status: ["pending", "approved"],
      content_type: "comment",
      created_after: new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      page: 1,
      limit: 20,
    } satisfies ICommunityPlatformContentReport.IRequest,
  ];
  for (const testCase of testCases) {
    const response =
      await api.functional.communityPlatform.admin.reports.statistics.index(
        adminConnection,
        { body: testCase },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      "pagination current page should be valid",
      response.pagination.current,
      testCase.page ?? 1,
    );
    TestValidator.equals(
      "pagination limit should be valid",
      response.pagination.limit,
      testCase.limit ?? 20,
    );
    TestValidator.predicate(
      "pagination records should be non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages should be non-negative",
      response.pagination.pages >= 0,
    );
    // Validate data structure
    TestValidator.predicate(
      "data should be an array",
      Array.isArray(response.data),
    );
    for (const item of response.data) {
      typia.assert(item);
      // Validate summary fields
      TestValidator.predicate(
        "report should have valid ID",
        typeof item.id === "string" && item.id.length > 0,
      );
      TestValidator.predicate(
        "report should have valid reason",
        typeof item.reason === "string",
      );
      TestValidator.predicate(
        "report status should be valid",
        ["pending", "approved", "dismissed"].includes(item.status),
      );
      TestValidator.predicate(
        "report should have valid timestamps",
        typeof item.created_at === "string" &&
          typeof item.updated_at === "string",
      );
      TestValidator.predicate(
        "report should have valid reporter",
        typeof item.reporter.id === "string" &&
          typeof item.reporter.email === "string",
      );
      TestValidator.predicate(
        "report should have valid community",
        typeof item.community.id === "string" &&
          typeof item.community.name === "string",
      );
      // Apply filter validation
      if (testCase.status && testCase.status.length > 0) {
        TestValidator.predicate(
          "report status should match filter",
          testCase.status.includes(item.status as any),
        );
      }
      if (testCase.created_after) {
        TestValidator.predicate(
          "report created_at should be after filter date",
          new Date(item.created_at) >= new Date(testCase.created_after),
        );
      }
      if (testCase.created_before) {
        TestValidator.predicate(
          "report created_at should be before filter date",
          new Date(item.created_at) <= new Date(testCase.created_before),
        );
      }
    }
  }
  // Test that community_id filter requires valid community (should be accessible to admin)
  // Note: Since we haven't created communities, this will likely return empty results
  const communityFilter = {
    community_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ICommunityPlatformContentReport.IRequest;
  const communityResponse =
    await api.functional.communityPlatform.admin.reports.statistics.index(
      adminConnection,
      { body: communityFilter },
    );
  typia.assert(communityResponse);
  TestValidator.predicate(
    "response should be valid with community filter",
    Array.isArray(communityResponse.data),
  );
  // Test reporter_member_id filter
  const reporterFilter = {
    reporter_member_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ICommunityPlatformContentReport.IRequest;
  const reporterResponse =
    await api.functional.communityPlatform.admin.reports.statistics.index(
      adminConnection,
      { body: reporterFilter },
    );
  typia.assert(reporterResponse);
  TestValidator.predicate(
    "response should be valid with reporter filter",
    Array.isArray(reporterResponse.data),
  );
  // Test search filter
  const searchFilter = {
    search: RandomGenerator.alphabets(5),
  } satisfies ICommunityPlatformContentReport.IRequest;
  const searchResponse =
    await api.functional.communityPlatform.admin.reports.statistics.index(
      adminConnection,
      { body: searchFilter },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "response should be valid with search filter",
    Array.isArray(searchResponse.data),
  );
}
