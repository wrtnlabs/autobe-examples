import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller post-purchase cancellation request data isolation.
 *
 * Validates that sellers only see cancellation requests for their own order items, not requests for other sellers' products. This test ensures role-based data isolation correctly filters cancellation requests by seller_id, preventing information leakage between competing sellers on the platform.
 *
 * The test creates two independent sellers (Seller A and Seller B), each with their own product and variant. A customer places orders containing products from both sellers, then creates cancellation requests for each order item BEFORE shipment. The test verifies that when each seller queries cancellation requests, they only see requests related to their own products.
 *
 * 1. Seller A joins and creates Product A with variant.
 * 2. Seller B joins and creates Product B with variant (different seller).
 * 3. Customer joins and places order containing products from both sellers.
 * 4. Customer creates cancellation request for Seller A's order item (while status is 'paid').
 * 5. Customer creates cancellation request for Seller B's order item (while status is 'paid').
 * 6. Seller A queries cancellation requests - should see only their own request (count = 1).
 * 7. Seller B queries cancellation requests - should see only their own request (count = 1).
 * 8. Verify data isolation prevents cross-seller visibility of cancellation requests.
 * 9. Sellers then ship their respective order items to complete the workflow.
 */
export async function test_api_seller_post_purchase_cancellation_request_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A setup - join and create product with variant
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerA);
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(productA);
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
      },
    );
  typia.assert(variantA);
  // 2. Seller B setup - join and create product with variant
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerB);
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {},
  );
  typia.assert(productB);
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
      },
    );
  typia.assert(variantB);
  // 3. Customer setup - join and add both products to cart
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // Add Product A variant to cart
  const cartItemA =
    await generate_random_shopping_mall_member_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variantA.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItemA);
  // Add Product B variant to cart
  const cartItemB =
    await generate_random_shopping_mall_member_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variantB.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItemB);
  // 4. Customer places order with both products
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Find order items for each seller
  const orderItemA = order.orderItems.find(
    (item) => item.productVariant.id === variantA.id,
  );
  const orderItemB = order.orderItems.find(
    (item) => item.productVariant.id === variantB.id,
  );
  TestValidator.predicate("order item A exists", orderItemA !== undefined);
  TestValidator.predicate("order item B exists", orderItemB !== undefined);
  // 5. Customer creates cancellation request for Seller A's item (while status is 'paid')
  const cancellationRequestA =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItemA!.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequestA);
  // 6. Customer creates cancellation request for Seller B's item (while status is 'paid')
  const cancellationRequestB =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItemB!.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequestB);
  // 7. Seller A queries cancellation requests - should see only their own
  const sellerAResult =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.index(
      sellerAConnection,
      {
        body: {},
      },
    );
  typia.assert(sellerAResult);
  TestValidator.equals(
    "Seller A sees exactly 1 cancellation request",
    sellerAResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "Seller A sees their own cancellation request",
    sellerAResult.data[0].id,
    cancellationRequestA.id,
  );
  TestValidator.predicate(
    "Seller A does not see Seller B's cancellation request",
    !sellerAResult.data.some((req) => req.id === cancellationRequestB.id),
  );
  TestValidator.equals(
    "Seller A's request is for correct order item",
    sellerAResult.data[0].orderItem.id,
    orderItemA!.id,
  );
  // 8. Seller B queries cancellation requests - should see only their own
  const sellerBResult =
    await api.functional.shoppingMall.seller.post_purchase.cancellation_requests.index(
      sellerBConnection,
      {
        body: {},
      },
    );
  typia.assert(sellerBResult);
  TestValidator.equals(
    "Seller B sees exactly 1 cancellation request",
    sellerBResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "Seller B sees their own cancellation request",
    sellerBResult.data[0].id,
    cancellationRequestB.id,
  );
  TestValidator.predicate(
    "Seller B does not see Seller A's cancellation request",
    !sellerBResult.data.some((req) => req.id === cancellationRequestA.id),
  );
  TestValidator.equals(
    "Seller B's request is for correct order item",
    sellerBResult.data[0].orderItem.id,
    orderItemB!.id,
  );
  // 9. Verify data isolation - sellers see different requests
  TestValidator.notEquals(
    "Sellers see different cancellation requests",
    sellerAResult.data[0].id,
    sellerBResult.data[0].id,
  );
  TestValidator.notEquals(
    "Sellers' requests reference different order items",
    sellerAResult.data[0].orderItem.id,
    sellerBResult.data[0].orderItem.id,
  );
  // 10. Sellers ship their respective order items to complete the workflow
  const shipmentA =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerAConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItemA!.id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(16),
        },
      },
    );
  typia.assert(shipmentA);
  const shipmentB =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerBConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItemB!.id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(16),
        },
      },
    );
  typia.assert(shipmentB);
}
