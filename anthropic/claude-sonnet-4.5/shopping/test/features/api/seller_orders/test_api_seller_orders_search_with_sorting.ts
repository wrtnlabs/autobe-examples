import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller order search sorting functionality.
 *
 * This test validates that the seller order search API correctly supports
 * sorting by different fields (created_at, total_amount, status) in both
 * ascending and descending order. It ensures that sellers can effectively
 * organize and prioritize their orders based on various criteria.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a seller account
 * 2. Retrieve orders with sorting by created_at (ascending and descending)
 * 3. Retrieve orders with sorting by total_amount (ascending and descending)
 * 4. Retrieve orders with sorting by status (ascending and descending)
 * 5. Validate that results are correctly ordered based on sort criteria
 */
export async function test_api_seller_orders_search_with_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+1"),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 4,
    }),
    href: "https://marketplace.example.com/seller/register",
    referrer: "https://marketplace.example.com/seller/info",
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 2: Test sorting by created_at in ascending order
  const sortByCreatedAtAsc = {
    page: 1,
    limit: 20,
    sort_by: "created_at" as const,
    sort_order: "asc" as const,
  } satisfies IShoppingMallOrder.IRequest;

  const resultCreatedAtAsc: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: sortByCreatedAtAsc,
    });
  typia.assert(resultCreatedAtAsc);

  // Validate ascending order by created_at
  if (resultCreatedAtAsc.data.length > 1) {
    for (let i = 0; i < resultCreatedAtAsc.data.length - 1; i++) {
      const current = new Date(resultCreatedAtAsc.data[i].created_at).getTime();
      const next = new Date(
        resultCreatedAtAsc.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "created_at ascending order validation",
        current <= next,
      );
    }
  }

  // Step 3: Test sorting by created_at in descending order
  const sortByCreatedAtDesc = {
    page: 1,
    limit: 20,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallOrder.IRequest;

  const resultCreatedAtDesc: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: sortByCreatedAtDesc,
    });
  typia.assert(resultCreatedAtDesc);

  // Validate descending order by created_at
  if (resultCreatedAtDesc.data.length > 1) {
    for (let i = 0; i < resultCreatedAtDesc.data.length - 1; i++) {
      const current = new Date(
        resultCreatedAtDesc.data[i].created_at,
      ).getTime();
      const next = new Date(
        resultCreatedAtDesc.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "created_at descending order validation",
        current >= next,
      );
    }
  }

  // Step 4: Test sorting by total_amount in ascending order
  const sortByAmountAsc = {
    page: 1,
    limit: 20,
    sort_by: "total_amount" as const,
    sort_order: "asc" as const,
  } satisfies IShoppingMallOrder.IRequest;

  const resultAmountAsc: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: sortByAmountAsc,
    });
  typia.assert(resultAmountAsc);

  // Validate ascending order by total_amount
  if (resultAmountAsc.data.length > 1) {
    for (let i = 0; i < resultAmountAsc.data.length - 1; i++) {
      const current = resultAmountAsc.data[i].total_amount;
      const next = resultAmountAsc.data[i + 1].total_amount;
      TestValidator.predicate(
        "total_amount ascending order validation",
        current <= next,
      );
    }
  }

  // Step 5: Test sorting by total_amount in descending order
  const sortByAmountDesc = {
    page: 1,
    limit: 20,
    sort_by: "total_amount" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallOrder.IRequest;

  const resultAmountDesc: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: sortByAmountDesc,
    });
  typia.assert(resultAmountDesc);

  // Validate descending order by total_amount
  if (resultAmountDesc.data.length > 1) {
    for (let i = 0; i < resultAmountDesc.data.length - 1; i++) {
      const current = resultAmountDesc.data[i].total_amount;
      const next = resultAmountDesc.data[i + 1].total_amount;
      TestValidator.predicate(
        "total_amount descending order validation",
        current >= next,
      );
    }
  }

  // Step 6: Test sorting by status in ascending order
  const sortByStatusAsc = {
    page: 1,
    limit: 20,
    sort_by: "status" as const,
    sort_order: "asc" as const,
  } satisfies IShoppingMallOrder.IRequest;

  const resultStatusAsc: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: sortByStatusAsc,
    });
  typia.assert(resultStatusAsc);

  // Validate ascending order by status
  if (resultStatusAsc.data.length > 1) {
    for (let i = 0; i < resultStatusAsc.data.length - 1; i++) {
      const current = resultStatusAsc.data[i].status;
      const next = resultStatusAsc.data[i + 1].status;
      TestValidator.predicate(
        "status ascending order validation",
        current <= next,
      );
    }
  }

  // Step 7: Test sorting by status in descending order
  const sortByStatusDesc = {
    page: 1,
    limit: 20,
    sort_by: "status" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallOrder.IRequest;

  const resultStatusDesc: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: sortByStatusDesc,
    });
  typia.assert(resultStatusDesc);

  // Validate descending order by status
  if (resultStatusDesc.data.length > 1) {
    for (let i = 0; i < resultStatusDesc.data.length - 1; i++) {
      const current = resultStatusDesc.data[i].status;
      const next = resultStatusDesc.data[i + 1].status;
      TestValidator.predicate(
        "status descending order validation",
        current >= next,
      );
    }
  }

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    resultCreatedAtAsc.pagination !== null &&
      resultCreatedAtAsc.pagination !== undefined,
  );
}
