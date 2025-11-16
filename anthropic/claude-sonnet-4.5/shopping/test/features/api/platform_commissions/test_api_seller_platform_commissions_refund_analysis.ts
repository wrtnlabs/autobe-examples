import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformCommission";
import type { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test refund-related filtering capabilities for platform commission records.
 *
 * This test validates the comprehensive refund analysis features of the
 * platform commission search API, including:
 *
 * 1. Boolean refund status filtering (is_refunded filter)
 * 2. Refunded amount range filtering (min_refunded_amount, max_refunded_amount)
 * 3. Combined filter scenarios for detailed refund impact analysis
 *
 * The test ensures that the API correctly separates refunded commission records
 * from active revenue records, supports range-based refunded amount queries,
 * and properly handles combinations of refund-related filters for comprehensive
 * financial reconciliation and refund impact assessment.
 *
 * Test workflow:
 *
 * 1. Create and authenticate seller account
 * 2. Test is_refunded=true filter (refunded commissions only)
 * 3. Test is_refunded=false filter (active revenue records only)
 * 4. Test refunded amount range filtering
 * 5. Test combined refund status and amount range filters
 * 6. Validate pagination with refund filters
 * 7. Verify response structure and type safety
 */
export async function test_api_seller_platform_commissions_refund_analysis(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account for refund analysis testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+82"),
      business_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 6,
      }),
      business_description: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
      store_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 2,
        wordMax: 5,
      }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Test is_refunded=true filter - should return only refunded commission records
  const refundedOnly =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          is_refunded: true,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(refundedOnly);

  // Validate pagination structure
  TestValidator.predicate(
    "refunded filter page number is valid",
    refundedOnly.pagination.current === 1,
  );
  TestValidator.predicate(
    "refunded filter limit is valid",
    refundedOnly.pagination.limit === 20,
  );

  // Validate all returned records are refunded
  if (refundedOnly.data.length > 0) {
    for (const commission of refundedOnly.data) {
      TestValidator.predicate(
        "is_refunded flag must be true for refunded filter",
        commission.is_refunded === true,
      );
      TestValidator.predicate(
        "refunded amount must be greater than 0 for refunded records",
        commission.refunded_amount > 0,
      );
    }
  }

  // Step 3: Test is_refunded=false filter - should return only active revenue records
  const activeOnly =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          is_refunded: false,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(activeOnly);

  // Validate all returned records are non-refunded
  if (activeOnly.data.length > 0) {
    for (const commission of activeOnly.data) {
      TestValidator.predicate(
        "is_refunded flag must be false for active filter",
        commission.is_refunded === false,
      );
      TestValidator.predicate(
        "refunded amount must be 0 for active revenue records",
        commission.refunded_amount === 0,
      );
    }
  }

  // Step 4: Test refunded amount range filtering with min_refunded_amount
  const minRefundFilter =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          min_refunded_amount: 100,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(minRefundFilter);

  // Validate minimum refunded amount filter
  if (minRefundFilter.data.length > 0) {
    for (const commission of minRefundFilter.data) {
      TestValidator.predicate(
        "refunded amount must meet minimum threshold",
        commission.refunded_amount >= 100,
      );
    }
  }

  // Step 5: Test refunded amount range filtering with max_refunded_amount
  const maxRefundFilter =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          max_refunded_amount: 1000,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(maxRefundFilter);

  // Validate maximum refunded amount filter
  if (maxRefundFilter.data.length > 0) {
    for (const commission of maxRefundFilter.data) {
      TestValidator.predicate(
        "refunded amount must be within maximum threshold",
        commission.refunded_amount <= 1000,
      );
    }
  }

  // Step 6: Test combined refunded amount range (both min and max)
  const rangeRefundFilter =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          min_refunded_amount: 50,
          max_refunded_amount: 500,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(rangeRefundFilter);

  // Validate refunded amount is within the specified range
  if (rangeRefundFilter.data.length > 0) {
    for (const commission of rangeRefundFilter.data) {
      TestValidator.predicate(
        "refunded amount must be within specified range",
        commission.refunded_amount >= 50 && commission.refunded_amount <= 500,
      );
    }
  }

  // Step 7: Test combination of is_refunded with refunded amount range
  const combinedFilter =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          is_refunded: true,
          min_refunded_amount: 100,
          max_refunded_amount: 1000,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(combinedFilter);

  // Validate combined filter conditions
  if (combinedFilter.data.length > 0) {
    for (const commission of combinedFilter.data) {
      TestValidator.predicate(
        "combined filter: must be refunded",
        commission.is_refunded === true,
      );
      TestValidator.predicate(
        "combined filter: refunded amount must be in range",
        commission.refunded_amount >= 100 && commission.refunded_amount <= 1000,
      );
    }
  }

  // Step 8: Test pagination with refund filters
  const paginatedRefund =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 10,
          is_refunded: true,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(paginatedRefund);

  TestValidator.predicate(
    "pagination limit is respected",
    paginatedRefund.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination metadata is consistent",
    paginatedRefund.pagination.limit === 10,
  );

  // Step 9: Test without refund filters (should return all records)
  const allCommissions =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(allCommissions);
}
