import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDispute";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportDispute";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_report_dispute_search_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate admin via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Set up search parameters for dispute search
  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
  const endDate = now.toISOString(); // current time
  const searchRequest: ICommunityPlatformReportDispute.IRequest = {
    startDate: startDate satisfies string & tags.Format<"date-time">,
    endDate: endDate satisfies string & tags.Format<"date-time">,
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies ICommunityPlatformReportDispute.IRequest;
  // Step 3: Execute the dispute search with admin connection
  const result: IPageICommunityPlatformReportDispute.ISummary =
    await api.functional.communityPlatform.admin.report.disputes.index(
      adminConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(result);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "pagination page matches request",
    result.pagination.current,
    searchRequest.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    searchRequest.limit,
  );
  TestValidator.predicate(
    "pagination records is positive",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Step 5: Validate disputes structure
  TestValidator.predicate(
    "disputes array is not empty",
    result.data.length > 0,
  );
  result.data.forEach((dispute) => {
    TestValidator.equals("dispute id is UUID", typeof dispute.id, "string");
    TestValidator.predicate(
      "dispute id matches UUID format",
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
        dispute.id,
      ),
    );
    TestValidator.equals(
      "dispute status is valid",
      ["pending", "investigating", "resolved", "dismissed"].includes(
        dispute.status,
      ),
      true,
    );
    TestValidator.equals(
      "dispute created_at is ISO date-time",
      typeof dispute.created_at,
      "string",
    );
    TestValidator.predicate(
      "dispute created_at matches date-time format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        dispute.created_at,
      ),
    );
    // No need to validate fields beyond what's in ISummary
  });
  // Step 6: Validate search criteria match
  // Since we're not filtering for a specific content, we'll just validate the structure
  // and that we received the expected number of results within our time range
  // (actual time range validation would require database state control)
}
