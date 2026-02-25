import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_history_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Use the authenticated seller connection (headers are updated by authorize_seller_join)
  const authenticatedSellerConnection: api.IConnection = sellerConnection;
  // Generate unique identifiers for testing
  const productVariantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderId: (string & tags.Format<"uuid">) | null =
    Math.random() > 0.5 ? typia.random<string & tags.Format<"uuid">>() : null;
  const sellerId = sellerAuth.data.profile.id;
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 24 * 60 * 60 * 1000 * 7,
  ).toISOString(); // 7 days ago
  const endDate = now.toISOString();
  // Test Case 1: Basic retrieval with no filters
  const basicRequest: IShoppingMallInventoryHistory.IRequest = {
    page: 1,
    limit: 10,
  };
  const basicResult =
    await api.functional.shoppingMall.seller.inventory_histories.index(
      authenticatedSellerConnection,
      {
        body: basicRequest,
      },
    );
  typia.assert(basicResult);
  // Validate response structure
  TestValidator.equals(
    "response has data array",
    Array.isArray(basicResult.data),
    true,
  );
  TestValidator.equals(
    "response has pagination",
    basicResult.pagination !== undefined,
    true,
  );
  // Test Case 2: Filter by product variant ID
  const variantFilterRequest: IShoppingMallInventoryHistory.IRequest = {
    shopping_mall_product_variant_id: productVariantId,
    page: 1,
    limit: 10,
  };
  const variantFilterResult =
    await api.functional.shoppingMall.seller.inventory_histories.index(
      authenticatedSellerConnection,
      {
        body: variantFilterRequest,
      },
    );
  typia.assert(variantFilterResult);
  // Test Case 3: Filter by seller ID
  const sellerFilterRequest: IShoppingMallInventoryHistory.IRequest = {
    shopping_mall_seller_id: sellerId,
    page: 1,
    limit: 10,
  };
  const sellerFilterResult =
    await api.functional.shoppingMall.seller.inventory_histories.index(
      authenticatedSellerConnection,
      {
        body: sellerFilterRequest,
      },
    );
  typia.assert(sellerFilterResult);
  // Test Case 4: Filter by order item ID
  const orderFilterRequest: IShoppingMallInventoryHistory.IRequest = {
    shopping_mall_order_item_id: orderId ?? undefined,
    page: 1,
    limit: 10,
  };
  const orderFilterResult =
    await api.functional.shoppingMall.seller.inventory_histories.index(
      authenticatedSellerConnection,
      {
        body: orderFilterRequest,
      },
    );
  typia.assert(orderFilterResult);
  // Test Case 5: Filter by reason codes
  const reasonFilterRequest: IShoppingMallInventoryHistory.IRequest = {
    reason: ["order", "refund"],
    page: 1,
    limit: 10,
  };
  const reasonFilterResult =
    await api.functional.shoppingMall.seller.inventory_histories.index(
      authenticatedSellerConnection,
      {
        body: reasonFilterRequest,
      },
    );
  typia.assert(reasonFilterResult);
  // Test Case 6: Filter by date range
  const dateRangeRequest: IShoppingMallInventoryHistory.IRequest = {
    created_at_range: [startDate, endDate],
    page: 1,
    limit: 10,
  };
  const dateRangeResult =
    await api.functional.shoppingMall.seller.inventory_histories.index(
      authenticatedSellerConnection,
      {
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Test Case 7: Combined filters
  const combinedFilterRequest: IShoppingMallInventoryHistory.IRequest = {
    shopping_mall_product_variant_id: productVariantId,
    reason: ["order", "order_cancellation", "refund"],
    created_at_range: [startDate, endDate],
    page: 1,
    limit: 5,
    sort_by: "quantity_change",
    sort_order: "desc",
  };
  const combinedFilterResult =
    await api.functional.shoppingMall.seller.inventory_histories.index(
      authenticatedSellerConnection,
      {
        body: combinedFilterRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Test Case 8: Pagination validation with different limits
  const paginationRequest: IShoppingMallInventoryHistory.IRequest = {
    page: 1,
    limit: 20,
  };
  const paginationResult =
    await api.functional.shoppingMall.seller.inventory_histories.index(
      authenticatedSellerConnection,
      {
        body: paginationRequest,
      },
    );
  typia.assert(paginationResult);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination has current",
    paginationResult.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    paginationResult.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    paginationResult.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    paginationResult.pagination.pages !== undefined,
    true,
  );
  // Test Case 9: Sorting by created_at
  const sortRequest: IShoppingMallInventoryHistory.IRequest = {
    sort_by: "created_at",
    sort_order: "asc",
    page: 1,
    limit: 10,
  };
  const sortResult =
    await api.functional.shoppingMall.seller.inventory_histories.index(
      authenticatedSellerConnection,
      {
        body: sortRequest,
      },
    );
  typia.assert(sortResult);
  // Test Case 10: Filter with null seller_id (system-generated records)
  const nullSellerFilterRequest: IShoppingMallInventoryHistory.IRequest = {
    shopping_mall_seller_id: undefined, // Use undefined instead of null
    page: 1,
    limit: 10,
  };
  const nullSellerFilterResult =
    await api.functional.shoppingMall.seller.inventory_histories.index(
      authenticatedSellerConnection,
      {
        body: nullSellerFilterRequest,
      },
    );
  typia.assert(nullSellerFilterResult);
  // Test Case 11: Large limit and different page
  const largePaginationRequest: IShoppingMallInventoryHistory.IRequest = {
    page: 2,
    limit: 50,
  };
  const largePaginationResult =
    await api.functional.shoppingMall.seller.inventory_histories.index(
      authenticatedSellerConnection,
      {
        body: largePaginationRequest,
      },
    );
  typia.assert(largePaginationResult);
  // Test Case 12: All filter parameters combined
  const allFiltersRequest: IShoppingMallInventoryHistory.IRequest = {
    shopping_mall_product_variant_id: productVariantId,
    shopping_mall_seller_id: sellerId,
    shopping_mall_order_item_id: orderId ?? undefined,
    reason: ["order", "refund", "order_cancellation"],
    created_at_range: [startDate, endDate],
    page: 1,
    limit: 100,
    sort_by: "created_at",
    sort_order: "desc",
  };
  const allFiltersResult =
    await api.functional.shoppingMall.seller.inventory_histories.index(
      authenticatedSellerConnection,
      {
        body: allFiltersRequest,
      },
    );
  typia.assert(allFiltersResult);
  // Validate that response structure matches expected DTO
  allFiltersResult.data.forEach((record) => {
    // Validate individual record structure
    TestValidator.equals("record has id", record.id !== undefined, true);
    TestValidator.equals(
      "record has quantity_change",
      record.quantity_change !== undefined,
      true,
    );
    TestValidator.equals(
      "record has reason",
      record.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "record has created_at",
      record.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "record has shopping_mall_product_variant_id",
      record.shopping_mall_product_variant_id !== undefined,
      true,
    );
    TestValidator.equals(
      "record has shopping_mall_order_item_id",
      record.shopping_mall_order_item_id !== undefined,
      true,
    );
  });
}