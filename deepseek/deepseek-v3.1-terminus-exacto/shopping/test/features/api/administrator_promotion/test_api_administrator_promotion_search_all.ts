import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdministratorPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test comprehensive search functionality for administrator promotion requests without filters.
 *
 * Verify pagination works correctly by searching all promotion requests with default parameters.
 * Validate that the response contains pagination metadata including current page, limit,
 * total records, and total pages. Ensure the data array contains promotion request summaries
 * with essential fields like id, request_reason, status, timestamps, and user references.
 */
export async function test_api_administrator_promotion_search_all(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection (assuming admin auth utility exists)
  const adminConnection: api.IConnection = { host: connection.host };
  // Note: In actual implementation, would call authorize_admin_login() if utility exists
  // Search all promotion requests with empty filters (default pagination)
  const result = await api.functional.ecommerce.administrators.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceAdministratorPromotion.IRequest,
    },
  );
  // Validate the complete response structure - typia.assert() validates EVERYTHING
  typia.assert(result);
  // Validate pagination metadata calculations
  TestValidator.predicate(
    "valid page calculation",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit) ||
      (result.pagination.records === 0 && result.pagination.pages === 0),
  );
  TestValidator.predicate(
    "current page is valid",
    result.pagination.current >= 0 &&
      (result.pagination.pages === 0 ||
        result.pagination.current <= result.pagination.pages),
  );
  TestValidator.predicate(
    "limit is within bounds",
    result.pagination.limit >= 1 && result.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is consistent",
    result.pagination.records >= result.data.length,
  );
  // Validate data array structure - fix: change equals() to predicate() since we're testing a condition
  TestValidator.predicate(
    "data array length matches pagination",
    result.data.length <= result.pagination.limit,
  );
  // Validate promotion request status values are from allowed set
  const allowedStatuses = ["pending", "approved", "rejected"] as const;
  result.data.forEach((promotionRequest, index) => {
    TestValidator.predicate(
      `promotion request ${index} has valid status`,
      allowedStatuses.includes(
        promotionRequest.status as (typeof allowedStatuses)[number],
      ),
    );
  });
}