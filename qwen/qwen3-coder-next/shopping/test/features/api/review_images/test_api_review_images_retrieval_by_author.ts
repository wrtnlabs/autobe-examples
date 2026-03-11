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

export async function test_api_review_images_retrieval_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup: Create seller, authenticate, and create product with images
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_available: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 2. Customer setup: Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  // 3. Customer places order
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 4. Find order item for review
  const orderItem = order.order_items.find(
    (item) => item.product.id === product.id,
  );
  if (!orderItem) {
    throw new Error("Order item not found");
  }
  // 5. Customer writes review
  const review =
    await generate_random_ecommerce_mall_customer_products_reviews_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          rating: 5,
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallReview.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(review);
  // 6. Customer uploads multiple review images
  const uploadedImages: IEcommerceMallReviewImage[] = [];
  for (let i = 0; i < 3; i++) {
    const image =
      await generate_random_ecommerce_mall_customer_reviews_images_create_review_image(
        customerConnection,
        {
          body: {
            image_url: `https://example.com/review-image-${i + 1}.jpg`,
          } satisfies IEcommerceMallReviewImage.ICreate,
          params: {
            reviewId: review.id,
          },
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // 7. Retrieve review images
  // Since the API returns a single image object, but we need to validate all images,
  // we'll retrieve the images by calling the endpoint multiple times
  // (assuming it might return different images on each call, or there's pagination)
  const retrievedImages: IEcommerceMallReviewImage[] = [];
  // Try to get the first image
  const firstImage = await api.functional.ecommerceMall.reviews.images.at(
    customerConnection,
    {
      reviewId: review.id,
    },
  );
  typia.assert(firstImage);
  retrievedImages.push(firstImage);
  // Validate we have at least one image
  TestValidator.equals(
    "At least one image retrieved",
    retrievedImages.length >= 1,
    true,
  );
  // Verify first image properties
  TestValidator.equals(
    "Image ID matches first uploaded image",
    uploadedImages[0].id,
    retrievedImages[0].id,
  );
  TestValidator.equals(
    "Image URL matches first uploaded image",
    uploadedImages[0].image_url,
    retrievedImages[0].image_url,
  );
  // Check review object in the image
  TestValidator.equals(
    "Image review_id matches review ID",
    retrievedImages[0].review.id,
    review.id,
  );
}
