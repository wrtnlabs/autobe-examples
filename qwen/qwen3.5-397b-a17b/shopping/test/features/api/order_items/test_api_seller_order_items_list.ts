import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller order items list retrieval from dashboard.
 *
 * Validates the complete workflow where an authenticated seller retrieves their order items through the seller dashboard endpoint. This test ensures that sellers can view their order items for fulfillment management, including items awaiting shipment, in transit, or delivered.
 *
 * The test verifies that the paginated response contains all required fields including order item details, product information, variant options, seller references, and shipment tracking data. Special attention is given to validating that order items are correctly filtered by the authenticated seller and sorted by creation date.
 *
 * 1. Seller account is registered and authenticated via join endpoint.
 * 2. Seller calls PATCH /shoppingMall/seller/seller/order-items with empty request body.
 * 3. Validates response structure matches IPageIShoppingMallOrderItem.ISummary.
 * 4. Verifies each order item contains required fields: id, quantity, price, status, orderCode, product, productVariant, seller, and shipment.
 * 5. Validates pagination metadata includes current page, limit, total records, and total pages.
 * 6. Confirms all order items belong to the authenticated seller.
 * 7. Verifies shipment is null for items not yet shipped (status 'paid').
 */
export async function test_api_seller_order_items_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Call order items list endpoint with empty request body
  const response =
    await api.functional.shoppingMall.seller.seller.order_items.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 4. Validate response data structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 5. Validate each order item structure
  for (const item of response.data) {
    // Validate required fields exist
    TestValidator.predicate("item has id", item.id !== undefined);
    TestValidator.predicate("item has quantity", item.quantity !== undefined);
    TestValidator.predicate("item has price", item.price !== undefined);
    TestValidator.predicate("item has status", item.status !== undefined);
    TestValidator.predicate("item has orderCode", item.orderCode !== undefined);
    TestValidator.predicate(
      "item has created_at",
      item.created_at !== undefined,
    );
    TestValidator.predicate(
      "item has updated_at",
      item.updated_at !== undefined,
    );
    // Validate nested objects exist
    TestValidator.predicate("item has product", item.product !== undefined);
    TestValidator.predicate(
      "item has productVariant",
      item.productVariant !== undefined,
    );
    TestValidator.predicate("item has seller", item.seller !== undefined);
    // Validate seller matches authenticated seller
    TestValidator.equals(
      "seller id matches authenticated seller",
      item.seller.id,
      sellerAuth.id,
    );
    // Validate shipment is null for unpaid items
    if (item.status === "paid") {
      TestValidator.predicate(
        "shipment is null for paid items",
        item.shipment === null,
      );
    }
    // Validate product summary structure
    TestValidator.predicate("product has id", item.product.id !== undefined);
    TestValidator.predicate(
      "product has name",
      item.product.name !== undefined,
    );
    TestValidator.predicate(
      "product has base_price",
      item.product.base_price !== undefined,
    );
    // Validate productVariant summary structure
    TestValidator.predicate(
      "variant has id",
      item.productVariant.id !== undefined,
    );
    TestValidator.predicate(
      "variant has sku_code",
      item.productVariant.sku_code !== undefined,
    );
    TestValidator.predicate(
      "variant has option_values",
      item.productVariant.option_values !== undefined,
    );
  }
  // 6. Validate sorting (created_at descending) if multiple items exist
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentItem = response.data[i];
      const nextItem = response.data[i + 1];
      TestValidator.predicate(
        `items sorted by created_at descending (index ${i})`,
        new Date(currentItem.created_at).getTime() >=
          new Date(nextItem.created_at).getTime(),
      );
    }
  }
  // 7. Validate pagination consistency
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
}
