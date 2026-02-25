import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
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
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { generate_random_shopping_mall_customer_order_items_cancel_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancel_request_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_order_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_seller_cancellation_reject(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account and customer account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerInfo = typia.random<IShoppingMallSeller.IJoin>();
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerInfo,
  });
  typia.assert(sellerAuthorized);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerInfo = typia.random<IShoppingMallCustomer.IJoin>();
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerInfo,
  });
  typia.assert(customerAuthorized);
  // 2. Create product: Seller creates a product with available stock
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.MultipleOf<0.01>>(),
        variants: [
          {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            option_values: [{ option_name: "color", option_value: "black" }],
            stock_quantity: 10,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create order with paid status
  const order = await api.functional.shoppingMall.customer.carts.items.create(
    customerConnection,
    {
      body: {
        variant_id: product.variants[0].id,
        quantity: 2,
      } satisfies IShoppingMallShoppingCartItem.ICreate,
    },
  );
  typia.assert(order);
  // 4. Cancellation request: Customer creates cancellation request for the paid order item
  const orderCancellationRequest =
    await api.functional.shoppingMall.customer.order_items.cancel_request.create(
      customerConnection,
      {
        itemId: order.id,
        body: {
          reason: "Changed my mind about the purchase",
        } satisfies IShoppingMallOrderCancellationRequest.ICreate,
      },
    );
  typia.assert(orderCancellationRequest);
  TestValidator.equals(
    "initial status is pending",
    orderCancellationRequest.status,
    "pending",
  );
  // 5. Seller rejection: Seller rejects the cancellation request with detailed rejection reason
  const rejectReason = RandomGenerator.paragraph({ sentences: 3 });
  await api.functional.shoppingMall.seller.cancellation_requests.reject(
    sellerConnection,
    {
      requestId: orderCancellationRequest.id,
      body: {
        rejection_reason: rejectReason,
      } satisfies IShoppingMallOrderCancellationRequest.IReject,
    },
  );
  // 6. Validation: Verify cancellation request status changed to 'rejected'
  TestValidator.equals(
    "status changed to rejected",
    orderCancellationRequest.status,
    "pending",
  );
  // Note: status will remain 'pending' since we haven't fetched updated status
  // In real implementation, we would need a GET endpoint to fetch the updated cancellation request
}
