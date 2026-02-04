import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_moderation_reports_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner connection and authenticate via join
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformOwner.IJoin,
    });
  // ownerConnection.headers now contains authorization token
  // Step 2: Retrieve all reports to establish baseline
  const allReportsResponse =
    await api.functional.communityPlatform.owner.moderation.reports.index(
      ownerConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(allReportsResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination property exists",
    allReportsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit property exists",
    allReportsResponse.pagination.limit,
    100,
  );
  // Step 3: Validate all returned reports have correct structure
  const responseStatuses: ("Pending" | "Approved" | "Dismissed")[] = [
    "Pending",
    "Approved",
    "Dismissed",
  ];
  for (const report of allReportsResponse.data) {
    // report_id must be UUID
    TestValidator.predicate(
      "report_id is valid UUID",
      typia.is<string & tags.Format<"uuid">>(report.report_id),
    );
    // target_entity_id must be UUID
    TestValidator.predicate(
      "target_entity_id is valid UUID",
      typia.is<string & tags.Format<"uuid">>(report.target_entity_id),
    );
    // status must be one of 'Pending', 'Approved', 'Dismissed' (capitalized - matches ISummary interface)
    TestValidator.predicate(
      "report status is valid",
      responseStatuses.includes(report.status),
    );
    // reporter_username must be non-empty string
    TestValidator.predicate(
      "reporter_username is non-empty string",
      typeof report.reporter_username === "string" &&
        report.reporter_username.length > 0,
    );
    // created_at must be ISO 8601 date-time
    TestValidator.predicate(
      "created_at is valid ISO 8601 date-time",
      typia.is<string & tags.Format<"date-time">>(report.created_at),
    );
  }
  // Step 4: Verify owner can retrieve reports with different filters
  const requestStatuses: ("pending" | "approved" | "dismissed")[] = [
    "pending",
    "approved",
    "dismissed",
  ]; // Request uses lowercase
  const targetTypes: ("post" | "comment")[] = ["post", "comment"];
  // Convert request status to response status mapping
  const statusMap: Record<string, "Pending" | "Approved" | "Dismissed"> = {
    pending: "Pending",
    approved: "Approved",
    dismissed: "Dismissed",
  };
  // For each status filter
  for (const status of requestStatuses) {
    const response =
      await api.functional.communityPlatform.owner.moderation.reports.index(
        ownerConnection,
        {
          body: {
            status,
            target_type: "post",
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    typia.assert(response);
    // Verify pagination
    TestValidator.equals("correct page", response.pagination.current, 1);
    TestValidator.equals("correct limit", response.pagination.limit, 10);
    // Verify all returned reports have the correct status (capitalized)
    for (const report of response.data) {
      TestValidator.equals(
        "report has correct status",
        report.status,
        statusMap[status],
      );
    }
  }
  // For each target_type filter
  for (const targetType of targetTypes) {
    const response =
      await api.functional.communityPlatform.owner.moderation.reports.index(
        ownerConnection,
        {
          body: {
            status: "pending",
            target_type: targetType,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    typia.assert(response);
    // Verify all returned reports have the correct target_type
    for (const report of response.data) {
      TestValidator.equals(
        "report has correct target_type",
        report.target_type,
        targetType,
      );
    }
  }
  // Test pagination with minimal page size
  const firstPage =
    await api.functional.communityPlatform.owner.moderation.reports.index(
      ownerConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  const secondPage =
    await api.functional.communityPlatform.owner.moderation.reports.index(
      ownerConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          page: 2,
          limit: 1,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(firstPage);
  typia.assert(secondPage);
  TestValidator.equals(
    "first page has correct page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "second page has correct page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "each page has correct limit",
    firstPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "each page has correct limit",
    secondPage.pagination.limit,
    1,
  );
  // Verify unique data between pages (no overlap)
  const firstPageIds = new Set(firstPage.data.map((r) => r.report_id));
  const secondPageIds = new Set(secondPage.data.map((r) => r.report_id));
  const overlap = [...firstPageIds].filter((id) => secondPageIds.has(id));
  TestValidator.equals("no overlap between pages", overlap.length, 0);
  // Step 5: Verify non-owner cannot access moderation reports
  // Create another connection and authenticate as different user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth: ICommunityPlatformOwner.IAuthorized =
    await authorize_owner_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformOwner.IJoin,
    });
  // Attempt to retrieve reports with standard user connection
  // This should return 403 Forbidden
  await TestValidator.error("non-owner receives 403", async () => {
    await api.functional.communityPlatform.owner.moderation.reports.index(
      userConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  });
}
