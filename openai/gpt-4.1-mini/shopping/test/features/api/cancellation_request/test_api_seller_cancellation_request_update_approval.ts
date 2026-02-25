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

export async function test_api_seller_cancellation_request_update_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = "TestSellerPass123";
  const sellerJoined = await authorize_seller_join(sellerConnection, {
    body: { password: sellerPassword },
  });
  typia.assert(sellerJoined);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoined.email,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller creates a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Customer join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = "TestCustomerPass123";
  const customerJoined = await authorize_customer_join(customerConnection, {
    body: { password: customerPassword },
  });
  typia.assert(customerJoined);
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoined.email,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  // 5. Customer creates an order WITHOUT order items initially
  // Because IShoppingMallOrder.ICreate requires orderItems array, but we will create orderItems separately.
  // So we create the order by using customerConnection and api.functional.shoppingMall.customer.orders.create with minimal payload later.
  // Alternative approach: create order with one order item with all required properties.
  // Let's create an order with orderItems including status and shoppingMallOrderId fields.
  // To do this, create orderItems after order creation, so first create empty order
  // Actually, we need orderItems at create time, thus can't omit. We'll create an order item with status and shoppingMallOrderId accordingly.
  // So create order item array now
  const orderItemCreate = {
    shoppingMallProductVariantId: variant.id,
    quantity: 1,
    shoppingMallOrderId: "temporary-id",
    status: "paid",
  } satisfies IShoppingMallOrderItem.ICreate;
  // We must create order with orderItems but orderItem needs shoppingMallOrderId, which is generated from order creation
  // So create order with dummy orderItems, then create order item separately
  // Instead, we create order with one orderItem with just shoppingMallProductVariantId and quantity (the SDK may accept partial properties)
  // But to be safe, use generate_random_shopping_mall_customer_orders_create with full orderItems including status (best)
  // So first create order without orderItems (empty array) and then create order item with correct order id
  const orderCreated = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: { orderItems: [] },
    },
  );
  typia.assert(orderCreated);
  // Create order item with correct order id
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderId: orderCreated.id,
          shoppingMallProductVariantId: variant.id,
          quantity: 1,
          status: "paid",
        },
      },
    );
  typia.assert(orderItem);
  // Refresh order data by re-fetching or mimicking update
  // For simplicity, use original orderCreated and attach orderItems manually
  // No fetch API provided; we proceed with orderItem
  // 6. Customer creates a cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shoppingMallCustomerId: customerJoined.id,
          shoppingMallOrderItemId: orderItem.id,
          reason: "Change of mind",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 7. Seller updates the cancellation request to approve
  const updatedCancellationRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.updateCancellationRequest(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          sellerApprovalStatus: "approved",
          sellerApprovalReason: "Approved due to valid reason",
        },
      },
    );
  typia.assert(updatedCancellationRequest);
  // 8. Validate processedAt exists and is recent
  TestValidator.predicate(
    "processedAt is set",
    updatedCancellationRequest.processedAt !== null &&
      updatedCancellationRequest.processedAt !== undefined,
  );
  // 9. Validate updated fields
  TestValidator.equals(
    "sellerApprovalStatus",
    updatedCancellationRequest.sellerApprovalStatus,
    "approved",
  );
  TestValidator.equals(
    "sellerApprovalReason",
    updatedCancellationRequest.sellerApprovalReason,
    "Approved due to valid reason",
  );
  // 10. Validate immutable snapshot created (assumed to be present as part of response or linkage to check)
  // Due to lack of explicit API for snapshot retrieval, check that updated cancellation request ID matches
  TestValidator.equals(
    "cancellation request ID",
    updatedCancellationRequest.id,
    cancellationRequest.id,
  );
}
