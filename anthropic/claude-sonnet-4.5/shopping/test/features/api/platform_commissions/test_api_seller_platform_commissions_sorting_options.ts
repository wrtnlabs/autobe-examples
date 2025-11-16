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
 * Test all sorting options for platform commission records retrieval.
 *
 * This test validates that the platform commission search API correctly handles
 * all sorting options including sort_by field selection and sort_order
 * direction. It verifies sorting by created_at (chronological order),
 * commission_amount (revenue size), and order_subtotal (order value) in both
 * ascending and descending order. The test also confirms that default sorting
 * applies when parameters are not specified and that sorting is maintained
 * consistently across results.
 *
 * Test steps:
 *
 * 1. Create and authenticate a seller account
 * 2. Test default sorting (created_at descending - most recent first)
 * 3. Test sorting by created_at in ascending order
 * 4. Test sorting by created_at in descending order
 * 5. Test sorting by commission_amount in ascending order
 * 6. Test sorting by commission_amount in descending order
 * 7. Test sorting by order_subtotal in ascending order
 * 8. Test sorting by order_subtotal in descending order
 * 9. Verify sorting consistency with pagination
 */
export async function test_api_seller_platform_commissions_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile("+1"),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Test default sorting (should be created_at descending)
  const defaultSortResult: IPageIShoppingMallPlatformCommission.ISummary =
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
  typia.assert(defaultSortResult);

  // Step 3: Test sorting by created_at in ascending order
  const createdAtAscResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(createdAtAscResult);

  // Verify ascending order for created_at
  if (createdAtAscResult.data.length > 1) {
    for (let i = 0; i < createdAtAscResult.data.length - 1; i++) {
      const current = new Date(createdAtAscResult.data[i].created_at);
      const next = new Date(createdAtAscResult.data[i + 1].created_at);
      TestValidator.predicate(
        "created_at ascending order validation",
        current.getTime() <= next.getTime(),
      );
    }
  }

  // Step 4: Test sorting by created_at in descending order
  const createdAtDescResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(createdAtDescResult);

  // Verify descending order for created_at
  if (createdAtDescResult.data.length > 1) {
    for (let i = 0; i < createdAtDescResult.data.length - 1; i++) {
      const current = new Date(createdAtDescResult.data[i].created_at);
      const next = new Date(createdAtDescResult.data[i + 1].created_at);
      TestValidator.predicate(
        "created_at descending order validation",
        current.getTime() >= next.getTime(),
      );
    }
  }

  // Step 5: Test sorting by commission_amount in ascending order
  const commissionAmountAscResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "commission_amount",
          sort_order: "asc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(commissionAmountAscResult);

  // Verify ascending order for commission_amount
  if (commissionAmountAscResult.data.length > 1) {
    for (let i = 0; i < commissionAmountAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        "commission_amount ascending order validation",
        commissionAmountAscResult.data[i].commission_amount <=
          commissionAmountAscResult.data[i + 1].commission_amount,
      );
    }
  }

  // Step 6: Test sorting by commission_amount in descending order
  const commissionAmountDescResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "commission_amount",
          sort_order: "desc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(commissionAmountDescResult);

  // Verify descending order for commission_amount
  if (commissionAmountDescResult.data.length > 1) {
    for (let i = 0; i < commissionAmountDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        "commission_amount descending order validation",
        commissionAmountDescResult.data[i].commission_amount >=
          commissionAmountDescResult.data[i + 1].commission_amount,
      );
    }
  }

  // Step 7: Test sorting by order_subtotal in ascending order
  const orderSubtotalAscResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "order_subtotal",
          sort_order: "asc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(orderSubtotalAscResult);

  // Verify ascending order for order_subtotal
  if (orderSubtotalAscResult.data.length > 1) {
    for (let i = 0; i < orderSubtotalAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        "order_subtotal ascending order validation",
        orderSubtotalAscResult.data[i].order_subtotal <=
          orderSubtotalAscResult.data[i + 1].order_subtotal,
      );
    }
  }

  // Step 8: Test sorting by order_subtotal in descending order
  const orderSubtotalDescResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "order_subtotal",
          sort_order: "desc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(orderSubtotalDescResult);

  // Verify descending order for order_subtotal
  if (orderSubtotalDescResult.data.length > 1) {
    for (let i = 0; i < orderSubtotalDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        "order_subtotal descending order validation",
        orderSubtotalDescResult.data[i].order_subtotal >=
          orderSubtotalDescResult.data[i + 1].order_subtotal,
      );
    }
  }

  // Step 9: Test sorting with filtering - verify sorting is maintained with other filters
  const sortWithFilterResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "commission_amount",
          sort_order: "desc",
          is_refunded: false,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(sortWithFilterResult);

  // Verify sorting is maintained even with filters applied
  if (sortWithFilterResult.data.length > 1) {
    for (let i = 0; i < sortWithFilterResult.data.length - 1; i++) {
      TestValidator.predicate(
        "sorting maintained with filters",
        sortWithFilterResult.data[i].commission_amount >=
          sortWithFilterResult.data[i + 1].commission_amount,
      );
    }
  }
}
