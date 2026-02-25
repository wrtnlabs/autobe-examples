import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_seller_cancellation_request_update_reason_only(
  connection: api.IConnection,
): Promise<void> {
  /*
   * Test scenario for a seller updating the cancellation reason without changing approval status
   * 1. Seller joins and logs in
   * 2. Seller creates a product and a product variant
   * 3. Customer joins and logs in
   * 4. Customer creates an order with order items for that product variant
   * 5. Customer creates a cancellation request for an order item
   * 6. Seller updates the cancellation request by changing the reason only
   * 7. Validate sellerApprovalStatus remains unchanged
   * 8. Validate processedAt is not set
   * 9. Validate updated reason persisted
   * 10. Verify authorization by trying update with non-owning seller
   */
  // 1. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerJoin);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "dummy_password",
    },
  });
  // 2. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerJoin);
  await authorize_customer_login(customerConnection, {
    body: { email: customerJoin.email, password: "dummy_password" },
  });
  // 5. Customer creates order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        orderItems: [
          {
            shoppingMallProductVariantId: variant.id,
            quantity: 1,
            status: "paid",
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 6. Customer creates cancellation request for the order item
  const orderItem = order.orderItems[0];
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shoppingMallCustomerId: customerJoin.id,
          shoppingMallOrderItemId: orderItem.id,
          reason: "Initial reason",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 7. Seller updates the cancellation request by modifying the reason only
  const originalApprovalStatus = cancellationRequest.sellerApprovalStatus;
  const updateReason = "Updated reason only";
  const updated =
    await api.functional.shoppingMall.seller.cancellation_requests.updateCancellationRequest(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          reason: updateReason,
        },
      },
    );
  typia.assert(updated);
  // 8. Validate that sellerApprovalStatus remains unchanged
  TestValidator.equals(
    "sellerApprovalStatus unchanged",
    updated.sellerApprovalStatus,
    originalApprovalStatus,
  );
  // 9. Validate that processedAt is not set
  TestValidator.equals(
    "processedAt is null",
    updated.processedAt ?? null,
    null,
  );
  // 10. Validate that updated reason is saved
  TestValidator.equals("reason updated", updated.reason, updateReason);
  // 11. Verify that a non-owning seller cannot update this cancellation request
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  const otherSeller = await authorize_seller_join(anotherSellerConnection, {
    body: {},
  });
  typia.assert(otherSeller);
  await TestValidator.error(
    "non-owning seller cannot update cancellation request",
    async () => {
      await api.functional.shoppingMall.seller.cancellation_requests.updateCancellationRequest(
        anotherSellerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
          body: {
            reason: "Malicious update",
          },
        },
      );
    },
  );
}
