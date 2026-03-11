import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_products_reviews_create";
import { generate_random_ecommerce_mall_customer_reviews_images_create_review_image } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_images_create_review_image";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_review_image } from "../../../prepare/prepare_random_ecommerce_mall_review_image";

export async function test_api_review_images_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create approved seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(3),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // Create a new seller connection with the received access token
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  sellerAuthConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAuthConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        is_available: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  // Create customer connection with token
  const customerAuthConnection: api.IConnection = { host: connection.host };
  customerAuthConnection.headers = {
    Authorization: customerAuthorized.token.access,
  };
  // 4. Customer places order for the product
  const order = await api.functional.ecommerceMall.customer.orders.create(
    customerAuthConnection,
  );
  typia.assert(order);
  // Find order item for the product we created
  const productOrderItem = order.order_items.find(
    (item) => item.product.id === product.id,
  );
  if (!productOrderItem) {
    throw new Error("Order item not found for created product");
  }
  // 5. Customer writes a review for the product
  const review =
    await generate_random_ecommerce_mall_customer_products_reviews_create(
      customerAuthConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          text_content: RandomGenerator.paragraph({ sentences: 2 }),
          order_item_id: productOrderItem.id,
        } satisfies IEcommerceMallReview.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(review);
  // 6. Customer uploads images to the review
  const image1 =
    await generate_random_ecommerce_mall_customer_reviews_images_create_review_image(
      customerAuthConnection,
      {
        body: {
          image_url: "https://example.com/image1.jpg",
        } satisfies IEcommerceMallReviewImage.ICreate,
        params: {
          reviewId: review.id,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_customer_reviews_images_create_review_image(
      customerAuthConnection,
      {
        body: {
          image_url: "https://example.com/image2.jpg",
        } satisfies IEcommerceMallReviewImage.ICreate,
        params: {
          reviewId: review.id,
        },
      },
    );
  typia.assert(image2);
  // 7. Seller retrieves review images and validates visibility
  const sellerConnectionForReview: api.IConnection = { host: connection.host };
  sellerConnectionForReview.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  const retrievedImages = await api.functional.ecommerceMall.reviews.images.at(
    sellerConnectionForReview,
    {
      reviewId: review.id,
    },
  );
  typia.assert(retrievedImages);
  // Verify that the seller can access the review images
  TestValidator.equals(
    "seller can retrieve review images",
    retrievedImages.review.id,
    review.id,
  );
  TestValidator.predicate(
    "images contain uploaded URLs",
    retrievedImages.image_url === "https://example.com/image1.jpg" ||
      retrievedImages.image_url === "https://example.com/image2.jpg",
  );
}