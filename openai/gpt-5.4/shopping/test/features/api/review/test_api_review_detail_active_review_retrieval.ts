import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_review_detail_active_review_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        rating: 5,
        content: RandomGenerator.paragraph({ sentences: 4 }),
      },
    },
  );
  typia.assert(review);
  const readConnection: api.IConnection = { host: connection.host };
  const detail = await api.functional.shoppingMall.products.reviews.at(
    readConnection,
    {
      productId: product.id,
      reviewId: review.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("review id matches", detail.id, review.id);
  TestValidator.equals(
    "review customer id matches",
    detail.customer.id,
    review.customer.id,
  );
  TestValidator.equals(
    "path product id matches fetched product id",
    detail.product.id,
    product.id,
  );
  TestValidator.equals(
    "review product id matches created product",
    detail.product.id,
    review.product.id,
  );
  TestValidator.equals(
    "review product name matches",
    detail.product.name,
    product.name,
  );
  TestValidator.equals(
    "review product description matches",
    detail.product.description,
    product.description,
  );
  TestValidator.equals(
    "review product base price matches",
    detail.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "review product status matches",
    detail.product.status,
    product.status,
  );
  TestValidator.equals(
    "review order id matches",
    detail.order.id,
    review.order.id,
  );
  TestValidator.equals(
    "review order item id matches",
    detail.orderItem.id,
    review.orderItem.id,
  );
  TestValidator.equals("review rating matches", detail.rating, review.rating);
  TestValidator.equals(
    "review content matches",
    detail.content,
    review.content,
  );
  TestValidator.equals(
    "review created_at unchanged",
    detail.created_at,
    review.created_at,
  );
  TestValidator.equals(
    "review updated_at unchanged",
    detail.updated_at,
    review.updated_at,
  );
  TestValidator.equals(
    "active review deleted_at is null",
    detail.deleted_at,
    null,
  );
  const detailAgain = await api.functional.shoppingMall.products.reviews.at(
    readConnection,
    {
      productId: product.id,
      reviewId: review.id,
    },
  );
  typia.assert(detailAgain);
  TestValidator.equals(
    "repeat read keeps same review id",
    detailAgain.id,
    detail.id,
  );
  TestValidator.equals(
    "repeat read keeps same product id",
    detailAgain.product.id,
    detail.product.id,
  );
  TestValidator.equals(
    "repeat read keeps same order id",
    detailAgain.order.id,
    detail.order.id,
  );
  TestValidator.equals(
    "repeat read keeps same order item id",
    detailAgain.orderItem.id,
    detail.orderItem.id,
  );
  TestValidator.equals(
    "repeat read keeps same rating",
    detailAgain.rating,
    detail.rating,
  );
  TestValidator.equals(
    "repeat read keeps same content",
    detailAgain.content,
    detail.content,
  );
  TestValidator.equals(
    "repeat read keeps same created_at",
    detailAgain.created_at,
    detail.created_at,
  );
  TestValidator.equals(
    "repeat read keeps same updated_at",
    detailAgain.updated_at,
    detail.updated_at,
  );
  TestValidator.equals(
    "repeat read keeps active deleted_at null",
    detailAgain.deleted_at,
    null,
  );
}
