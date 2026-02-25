import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerApprovalResponse";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_responses_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234" satisfies string & tags.Format<"password">,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(adminResponse);
  const adminId = adminResponse.id;
  // Test 1: Date range filtering with specific start and end dates
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString(); // current time
  const dateRangeResults =
    await api.functional.ecommerce.administrator.seller_approval_responses.index(
      adminConnection,
      {
        body: {
          responded_at_start: startDate satisfies string &
            tags.Format<"date-time">,
          responded_at_end: endDate satisfies string & tags.Format<"date-time">,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceSellerApprovalResponse.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  // Test 2: Administrator-specific filtering using the current admin's ID
  const adminFilterResults =
    await api.functional.ecommerce.administrator.seller_approval_responses.index(
      adminConnection,
      {
        body: {
          administrator_id: adminId satisfies string & tags.Format<"uuid">,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceSellerApprovalResponse.IRequest,
      },
    );
  typia.assert(adminFilterResults);
  // Test 3: Combined filtering with decision type and date range
  const combinedResults =
    await api.functional.ecommerce.administrator.seller_approval_responses.index(
      adminConnection,
      {
        body: {
          decision: "approved" satisfies "approved" as "approved",
          responded_at_start: startDate satisfies string &
            tags.Format<"date-time">,
          responded_at_end: endDate satisfies string & tags.Format<"date-time">,
          administrator_id: adminId satisfies string & tags.Format<"uuid">,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceSellerApprovalResponse.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Test 4: Empty date range (should return empty or latest results)
  const emptyDateRangeResults =
    await api.functional.ecommerce.administrator.seller_approval_responses.index(
      adminConnection,
      {
        body: {
          responded_at_start: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString() satisfies string & tags.Format<"date-time">,
          responded_at_end: new Date(
            Date.now() + 48 * 60 * 60 * 1000,
          ).toISOString() satisfies string & tags.Format<"date-time">,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IEcommerceSellerApprovalResponse.IRequest,
      },
    );
  typia.assert(emptyDateRangeResults);
  // Validate pagination structure exists in all responses
  TestValidator.predicate(
    "date range pagination exists",
    dateRangeResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "admin filter pagination exists",
    adminFilterResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "combined filter pagination exists",
    combinedResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "all responses have data arrays",
    Array.isArray(dateRangeResults.data) &&
      Array.isArray(adminFilterResults.data) &&
      Array.isArray(combinedResults.data),
  );
  // Validate pagination metadata types
  TestValidator.equals(
    "date range pagination current is number",
    typeof dateRangeResults.pagination.current,
    "number",
  );
  TestValidator.equals(
    "date range pagination limit is number",
    typeof dateRangeResults.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "date range pagination records is number",
    typeof dateRangeResults.pagination.records,
    "number",
  );
  TestValidator.equals(
    "date range pagination pages is number",
    typeof dateRangeResults.pagination.pages,
    "number",
  );
  // Verify that pagination values are reasonable
  TestValidator.predicate(
    "pagination current >= 0",
    dateRangeResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    dateRangeResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    dateRangeResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    dateRangeResults.pagination.pages >= 0,
  );
  // Verify that valid data records have expected structure when results exist
  if (dateRangeResults.data.length > 0) {
    const firstRecord = dateRangeResults.data[0];
    TestValidator.predicate(
      "record has id",
      typeof firstRecord.id === "string" && firstRecord.id.length > 0,
    );
    TestValidator.predicate(
      "record has decision",
      typeof firstRecord.decision === "string" &&
        firstRecord.decision.length > 0,
    );
    TestValidator.predicate(
      "record has responded_at",
      typeof firstRecord.responded_at === "string" &&
        firstRecord.responded_at.length > 0,
    );
    TestValidator.predicate(
      "record has administrator_id",
      typeof firstRecord.administrator_id === "string" &&
        firstRecord.administrator_id.length > 0,
    );
  }
}
