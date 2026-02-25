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

export async function test_api_customer_review_retrieval_success_authorized_customer(
  connection: api.IConnection,
): Promise<void> {
  /*
     Scenario 1: Successful retrieval of a product review by the review author (customer)
     - Precondition: The customer has registered and logged in.
     - Precondition: A product variant exists, and a product is created.
     - Precondition: The customer created an order and order items.
     - Precondition: The customer created a product review.
  
     Test Steps:
     1. Authenticate as the customer (join).
     2. Create a new product.
     3. Add a product variant to the product.
     4. Create an order by the customer.
     5. Create an order item linked to the order and product variant.
     6. Create a product review linked to the order item.
     7. Retrieve the product review using the reviewId.
  
     Validations:
     - The response body includes the full product review details including star rating, body text, references to customer, order, and order item.
     - The timestamps for createdAt, updatedAt, and deletedAt (null) are present.
     - HTTP status code 200 OK is returned.
     */
  // 1. Authenticate as the customer (join)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  typia.assert(customer);
  // 2. Authenticate as the seller (join), seller is needed to create the product
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerpassword",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(seller);
  // 3. Create a new product by the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(product);
  // 4. Add a product variant to the created product by the seller
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      { params: { productId: product.id }, body: undefined },
    );
  typia.assert(variant);
  // 5. Create an order by the customer
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        orderItems: [
          {
            shoppingMallProductVariantId: variant.id,
            quantity: 1,
          } as IShoppingMallOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order);
  // 6. Create an order item linked to the order and variant
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
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
  // 7. Create product review linked to the order item
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: randint(1, 5) satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(review);
  // 8. Retrieve the product review using the reviewId
  const gottenReview = await api.functional.shoppingMall.customer.reviews.at(
    customerConnection,
    { reviewId: review.id },
  );
  typia.assert(gottenReview);
  // 9. Validate the retrieved review
  TestValidator.equals("review id matches", gottenReview.id, review.id);
  TestValidator.equals("rating matches", gottenReview.rating, review.rating);
  TestValidator.equals("body matches", gottenReview.body, review.body);
  TestValidator.equals(
    "customer id matches",
    gottenReview.customer.id,
    customer.id,
  );
  TestValidator.equals("order id matches", gottenReview.order.id, order.id);
  TestValidator.equals(
    "order item id matches",
    gottenReview.orderItem.id,
    orderItem.id,
  );
  TestValidator.predicate(
    "createdAt is present",
    typeof gottenReview.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt is present",
    typeof gottenReview.updatedAt === "string",
  );
  TestValidator.equals("deletedAt is null", gottenReview.deletedAt, null);
}
