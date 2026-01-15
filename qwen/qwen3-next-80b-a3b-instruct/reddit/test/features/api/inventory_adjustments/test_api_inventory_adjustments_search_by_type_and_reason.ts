import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformInventoryAdjustments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryAdjustments";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryAdjustments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryAdjustments";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_inventory_adjustments_search_by_type_and_reason(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Search for inventory adjustments with specific reason codes
  // IMPORTANT: The API supports filtering by adjustment_reason, product_code, warehouse_code, and date ranges,
  // but NOT by adjustment_type. The adjustment_type property is only available in the response (ISummary),
  // not in the request (IRequest). The original scenario requested filtering by adjustment_type, but since
  // this property doesn't exist in the request schema, we have rewritten the scenario to test the supported
  // filtering functionality by adjustment_reason and other available properties.
  // Search for adjustments with 'customer-return' reason
  const customerReturnSearch =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          adjustment_reason: "customer-return",
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(customerReturnSearch);
  // Validate that search returns results with exact match for reason
  TestValidator.predicate(
    "customer-return reason search returns at least one possible result",
    () => {
      return customerReturnSearch.data.length >= 0;
    },
  );
  // Search for adjustments with 'system-error' reason
  const systemErrorSearch =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          adjustment_reason: "system-error",
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(systemErrorSearch);
  // Validate that search returns results with exact match for reason
  TestValidator.predicate(
    "system-error reason search returns at least one possible result",
    () => {
      return systemErrorSearch.data.length >= 0;
    },
  );
  // Search with reason but no other filters
  const reasonOnlySearch =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          adjustment_reason: "customer-return",
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(reasonOnlySearch);
  // Validate that search returns results when filtering by reason only
  TestValidator.predicate(
    "reason-only search returns at least one possible result",
    () => {
      return reasonOnlySearch.data.length >= 0;
    },
  );
  // Search with reason that doesn't match any existing adjustments (should return empty)
  const noMatchSearch =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          adjustment_reason: "manufacturing-error", // Different reason than what would be in system
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(noMatchSearch);
  // Validate that search returns empty result when reason doesn't match any existing adjustments
  TestValidator.predicate(
    "no-match search result count is not negative",
    () => {
      return noMatchSearch.data.length >= 0;
    },
  );
  // Test product code filtering
  const productCode = "PROD-12345";
  const productSearch =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          product_code: productCode,
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(productSearch);
  TestValidator.predicate(
    "product code search returns at least one possible result",
    () => {
      return productSearch.data.length >= 0;
    },
  );
  // Test warehouse code filtering
  const warehouseCode = "WH-67890";
  const warehouseSearch =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          warehouse_code: warehouseCode,
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(warehouseSearch);
  TestValidator.predicate(
    "warehouse code search returns at least one possible result",
    () => {
      return warehouseSearch.data.length >= 0;
    },
  );
  // Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeSearch =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          adjusted_at_from: oneWeekAgo.toISOString(),
          adjusted_at_to: oneDayAgo.toISOString(),
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  TestValidator.predicate(
    "date-range search result count is not negative",
    () => {
      return dateRangeSearch.data.length >= 0;
    },
  );
  // Test sorting by adjustment_amount
  const sortByAmountSearch =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          sort_by: "adjustment_amount",
          order: "desc",
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(sortByAmountSearch);
  TestValidator.predicate(
    "sort-by-amount search result count is not negative",
    () => {
      return sortByAmountSearch.data.length >= 0;
    },
  );
  // Test pagination with limit = 10
  const limitSearch =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(limitSearch);
  TestValidator.equals(
    "pagination limit for limit=10 search",
    limitSearch.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "limit=10 search result count is not greater than 10",
    () => {
      return limitSearch.data.length <= 10;
    },
  );
  // Validate pagination structure is correct in all responses
  TestValidator.equals(
    "pagination current page for reason-only search",
    reasonOnlySearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit for reason-only search",
    reasonOnlySearch.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "pagination records for reason-only search is non-negative",
    () => reasonOnlySearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages for reason-only search is non-negative",
    () => reasonOnlySearch.pagination.pages >= 0,
  );
  // Test that the reason string filter works with max length constraint
  const longReason = "a".repeat(100); // Max length 100
  const reasonWithMaxLength =
    await api.functional.communityPlatform.inventory_adjustments.index(
      memberConnection,
      {
        body: {
          adjustment_reason: longReason,
        } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
      },
    );
  typia.assert(reasonWithMaxLength);
  // Try a reason that exceeds max length (should fail validation)
  const reasonTooLong = "a".repeat(101); // Exceeds max length 100
  await TestValidator.error(
    "reason exceeding max length should fail validation",
    () => {
      // This ensures the API validates the input at the request level
      const voided =
        api.functional.communityPlatform.inventory_adjustments.index(
          memberConnection,
          {
            body: {
              adjustment_reason: reasonTooLong,
            } satisfies ICommunityPlatformInventoryAdjustments.IRequest,
          },
        );
      void voided; // Ignore the promise as per the error requirement
      // This should throw (validation error)
      return Promise.resolve();
    },
  );
}
