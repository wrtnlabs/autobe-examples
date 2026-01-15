import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSalesDiscountUse } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesDiscountUse";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSalesDiscountUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSalesDiscountUse";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_sales_discount_usage_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin to access sales discount usage analytics
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate multiple discount usage records with realistic data
  const discountCodes: string[] = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const users: string[] = ArrayUtil.repeat(10, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const salesStatuses: Array<"paid" | "pending" | "cancelled" | "refunded"> = [
    "paid",
    "pending",
    "cancelled",
    "refunded",
  ] as const;
  // Create 20 discount usage records with varied filter criteria
  const discountUsages = ArrayUtil.repeat(20, (index) => {
    const discountCodeId = discountCodes[index % discountCodes.length];
    const userId = users[index % users.length];
    const applicationTimestamp = new Date(
      Date.now() - (20 - index) * 24 * 60 * 60 * 1000,
    ).toISOString(); // Dates from 20 days ago to yesterday
    const saleId = typia.random<string & tags.Format<"uuid">>();
    const discountAmount = typia.random<
      number & tags.Minimum<0> & tags.Maximum<500>
    >();
    const usageCount = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >();
    const status: "applied" | "cancelled" =
      index % 2 === 0 ? "applied" : "cancelled";
    const notes =
      index % 10 === 0 ? "Manual adjustment due to billing error" : undefined;
    return {
      discount_code_id: discountCodeId,
      user_id: userId,
      sale_id: saleId,
      discount_amount: discountAmount,
      usage_count: usageCount,
      application_timestamp: applicationTimestamp,
      status: status,
      notes: notes,
      usage_id: typia.random<string & tags.Format<"uuid">>(), // Added required usage_id property
    } satisfies ICommunityPlatformSalesDiscountUse;
  });
  // Step 3: Execute API call with multiple filter conditions
  const request: ICommunityPlatformSalesDiscountUse.IRequest = {
    discountCode: discountCodes[0], // Filter by specific discount code
    createdAtStart: new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000,
    ).toISOString(), // Last 10 days
    createdAtEnd: new Date().toISOString(), // Up to today
    usageCountMin: 2, // Only usages with minimum 2 applications
    usageCountMax: 4, // Only usages with maximum 4 applications
    salesStatus: "paid", // Filter by paid sales status (this filters the query but is not visible in response)
    sortBy: "usageDate", // Sort by application timestamp
    sortOrder: "desc", // Newest first
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformSalesDiscountUse.IRequest;
  // Step 4: Call admin sales discount usage analytics endpoint
  const response: IPageICommunityPlatformSalesDiscountUse =
    await api.functional.communityPlatform.admin.salesdiscountuses.index(
      adminConnection,
      { body: request },
    );
  // Step 5: Validate response structure and type safety using typia.assert
  typia.assert(response);
  // Step 6: Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be positive",
    () => response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages should be positive",
    () => response.pagination.pages > 0,
  );
  // Step 7: Validate that data array contains items
  TestValidator.predicate(
    "data array should not be empty",
    () => response.data.length > 0,
  );
  // Step 8: Validate that records match the discountCode filter
  for (const record of response.data) {
    TestValidator.predicate(
      "discount code matches filter",
      () => record.discount_code_id === discountCodes[0],
    );
    TestValidator.predicate("creation timestamp within range", () => {
      const timestamp = new Date(record.application_timestamp).getTime();
      const start = new Date(request.createdAtStart!).getTime();
      const end = new Date(request.createdAtEnd!).getTime();
      return timestamp >= start && timestamp <= end;
    });
    TestValidator.predicate(
      "usage count within range",
      () =>
        record.usage_count >= (request.usageCountMin ?? 0) &&
        record.usage_count <= (request.usageCountMax ?? Infinity),
    );
    TestValidator.predicate(
      "status is either applied or cancelled",
      () => record.status === "applied" || record.status === "cancelled",
    );
  }
  // Step 9: Validate sorting order (descending by usage date)
  // Check that records are sorted in descending order by application_timestamp
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentTimestamp = new Date(
      response.data[i].application_timestamp,
    ).getTime();
    const nextTimestamp = new Date(
      response.data[i + 1].application_timestamp,
    ).getTime();
    TestValidator.predicate(
      "records sorted by usage date in descending order",
      () => currentTimestamp >= nextTimestamp,
    );
  }
  // Step 10: Validate that records are within the requested page size
  TestValidator.predicate(
    "total records in page should not exceed limit",
    () => response.data.length <= request.limit,
  );
}