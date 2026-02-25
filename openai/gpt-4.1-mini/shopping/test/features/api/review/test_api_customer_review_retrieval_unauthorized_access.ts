import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
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
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_customer_review_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  /*
     Scenario 2: Attempt to retrieve another customer's review (unauthorized access)
  
     - Precondition: Another customer exists and has created a review.
     - Precondition: The requesting customer is authenticated but not the review's author.
  
     Test Steps:
     1. Authenticate as customer A (join).
     2. Authenticate as customer B (join).
     3. Customer B creates a product, product variant, order, order items, and a review.
     4. Customer A attempts to retrieve customer B's review using the reviewId.
  
     Validations:
     - Operation is forbidden with HTTP status code 403 Forbidden returned.
     - Response body contains an appropriate error message for unauthorized access.
    */
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerBConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as customer A
  const customerAJoinResult = await authorize_customer_join(
    customerAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "customerApass123",
      },
    },
  );
  typia.assert(customerAJoinResult);
  customerAConnection.headers = {
    Authorization: customerAJoinResult.token.access,
  };
  // 2. Authenticate as customer B
  const customerBJoinResult = await authorize_customer_join(
    customerBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "customerBpass123",
      },
    },
  );
  typia.assert(customerBJoinResult);
  customerBConnection.headers = {
    Authorization: customerBJoinResult.token.access,
  };
  // 3. Seller must be authenticated to create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerPass123",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerJoinResult);
  sellerConnection.headers = { Authorization: sellerJoinResult.token.access };
  // Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<number & tags.Type<"uint32">>(),
        product_subcategory_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // Seller creates a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          priceOverride: null,
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // Customer B creates an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerBConnection,
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
  // Customer B creates an order item linked to order and variant
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerBConnection,
      {
        body: {
          shoppingMallOrderId: order.id,
          shoppingMallProductVariantId: variant.id,
          quantity: 1,
          status: "paid",
        },
      },
    );
  typia.assert(orderItem);
  // Customer B creates a review
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerBConnection,
    {
      body: {
        rating: 5,
        body: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(review);
  // 4. Customer A attempts to retrieve customer B's review
  await TestValidator.httpError(
    "Unauthorized customer review access should be forbidden",
    403,
    async () => {
      await api.functional.shoppingMall.customer.reviews.at(
        customerAConnection,
        {
          reviewId: review.id,
        },
      );
    },
  );
}
