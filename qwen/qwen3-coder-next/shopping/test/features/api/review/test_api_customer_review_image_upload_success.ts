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

export async function test_api_customer_review_image_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller creates product with variants
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials: IEcommerceMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(sellerAuthorized);
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        is_available: true,
        category_id: typia.random<string & tags.Format<"uuid">>(), // FIXED: removed tags.Minimum<1> (unsupported on UUID)
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            price_override: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          },
        ],
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  typia.assert<IEcommerceMallProduct>(product);
  const variant = product.variants[0];
  if (!variant) throw new Error("Variant not found");
  // 2. Customer registers and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials: IEcommerceMallCustomer.IJoin = {
    email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(), // FIXED: Added MinLength<1> constraint
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
    ip: "127.0.0.1",
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(customerAuthorized);
  // 3. Customer purchases product and writes review
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  typia.assert<IEcommerceMallOrder>(order);
  const orderItem = order.order_items[0];
  if (!orderItem) throw new Error("Order item not found");
  const review =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      customerConnection,
      {
        productId: product.id,
        body: {
          order_item_id: orderItem.id,
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review);
  typia.assert<IEcommerceMallReview>(review);
  // 4. Upload review image
  const imageUrl = "https://example.com/review-image.png";
  const reviewImage =
    await api.functional.ecommerceMall.customer.reviews.images.createReviewImage(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          image_url: imageUrl,
        } satisfies IEcommerceMallReviewImage.ICreate,
      },
    );
  typia.assert(reviewImage);
  typia.assert<IEcommerceMallReviewImage>(reviewImage);
  // 5. Validate
  TestValidator.equals("image URL matches", reviewImage.image_url, imageUrl);
  TestValidator.equals("review ID matches", reviewImage.review.id, review.id);
  TestValidator.predicate(
    "sort_order exists",
    reviewImage.sort_order !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    reviewImage.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    reviewImage.updated_at !== undefined,
  );
}