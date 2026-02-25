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

export async function test_api_seller_cancellation_request_update_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinOutput = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongpassword",
      shopName: RandomGenerator.name(2),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerJoinOutput);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinOutput.email,
      password: "strongpassword",
    },
  });
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        product_subcategory_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Seller creates a product variant
  const productVariant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          priceOverride: null,
          stockQuantity: 10,
        },
      },
    );
  typia.assert(productVariant);
  // 4. Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinOutput = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customerpass",
    },
  });
  typia.assert(customerJoinOutput);
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoinOutput.email,
      password: "customerpass",
    },
  });
  // 5. Customer creates an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        orderItems: [
          {
            shoppingMallProductVariantId: productVariant.id,
            quantity: 1,
            status: "paid",
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 6. Customer creates order item
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderId: order.id,
          shoppingMallProductVariantId: productVariant.id,
          quantity: 1,
          status: "paid",
        },
      },
    );
  typia.assert(orderItem);
  // 7. Customer creates a cancellation request
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shoppingMallCustomerId: customerJoinOutput.id,
          shoppingMallOrderItemId: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 8. Seller updates the cancellation request, rejecting it
  const updateBody: IShoppingMallCancellationRequest.IUpdate = {
    sellerApprovalStatus: "rejected",
    sellerApprovalReason: RandomGenerator.paragraph({ sentences: 1 }),
  };
  const updatedCancellationRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.updateCancellationRequest(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCancellationRequest);
  // 9. Validate updated fields
  TestValidator.equals(
    "sellerApprovalStatus is rejected",
    updatedCancellationRequest.sellerApprovalStatus,
    "rejected",
  );
  TestValidator.predicate(
    "sellerApprovalReason is not empty",
    updatedCancellationRequest.sellerApprovalReason !== null &&
      updatedCancellationRequest.sellerApprovalReason !== undefined &&
      updatedCancellationRequest.sellerApprovalReason.length > 0,
  );
  // Validate processedAt is set
  TestValidator.predicate(
    "processedAt timestamp is set",
    updatedCancellationRequest.processedAt !== null &&
      updatedCancellationRequest.processedAt !== undefined,
  );
  // Validate other fields remain unchanged
  TestValidator.equals(
    "cancellationRequest id",
    updatedCancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "shoppingMallCustomerId unchanged",
    updatedCancellationRequest.shoppingMallCustomerId,
    cancellationRequest.shoppingMallCustomerId,
  );
  TestValidator.equals(
    "shoppingMallOrderItemId unchanged",
    updatedCancellationRequest.shoppingMallOrderItemId,
    cancellationRequest.shoppingMallOrderItemId,
  );
  TestValidator.equals(
    "reason unchanged",
    updatedCancellationRequest.reason,
    cancellationRequest.reason,
  );
  // 10. Confirm snapshot creation is beyond scope of this test, assumed handled server-side
}
