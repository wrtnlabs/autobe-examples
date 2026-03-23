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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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

export async function test_api_review_images_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>() satisfies string as string,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://example.com/registration",
    referrer: "https://example.com/home",
    ip: "127.0.0.1",
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuth = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    { body: customerData },
  );
  typia.assert(customerAuth);
  // Create new connection for authenticated customer
  const customerAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuth.token.access },
  };
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>() satisfies string as string,
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    { body: sellerData },
  );
  typia.assert(sellerAuth);
  // Create new connection for authenticated seller
  const sellerAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuth.token.access },
  };
  // 3. Seller creates a product
  const categoryData = typia.random<IEcommerceMallCategory.ISummary>();
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    is_available: true,
    category_id: categoryData.id,
    images: [
      {
        files: [
          "https://example.com/image1.jpg",
          "https://example.com/image2.jpg",
        ],
      } satisfies IEcommerceMallProductImage.IUpload,
    ],
    variants: [
      {
        sku_code: RandomGenerator.alphaNumeric(8),
        price_override: null,
      } satisfies IEcommerceMallProductVariant.ICreate,
    ],
  } satisfies IEcommerceMallProduct.ICreate;
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerAuthenticatedConnection,
    { body: productData },
  );
  typia.assert(product);
  // 4. Customer places an order
  const order = await api.functional.ecommerceMall.customer.orders.create(
    customerAuthenticatedConnection,
  );
  typia.assert(order);
  // 5. Customer writes a review for the product
  // Get the first order item
  const orderItem = order.order_items[0];
  const reviewData = {
    order_item_id: orderItem.id,
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    text_content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEcommerceMallReview.ICreate;
  const review =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      customerAuthenticatedConnection,
      {
        productId: product.id,
        body: reviewData,
      },
    );
  typia.assert(review);
  // 6. Customer uploads multiple images to the review
  const uploadedImages: IEcommerceMallReviewImage[] = [];
  // Upload 3 images
  for (let i = 0; i < 3; i++) {
    const imageData = {
      image_url: `https://example.com/review-image-${i}.jpg`,
    } satisfies IEcommerceMallReviewImage.ICreate;
    const uploadedImage =
      await api.functional.ecommerceMall.customer.reviews.images.createReviewImage(
        customerAuthenticatedConnection,
        {
          reviewId: review.id,
          body: imageData,
        },
      );
    typia.assert(uploadedImage);
    uploadedImages.push(uploadedImage);
  }
  // 7. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Create admin account
  const adminJoinData = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IEcommerceMallAdmin.IJoin;
  await api.functional.ecommerceMall.auth.admin.join(adminConnection, {
    body: adminJoinData,
  });
  // Login as admin
  const adminLoginData = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IEcommerceMallAdmin.ILogin;
  const adminAuth = await api.functional.ecommerceMall.auth.admin.login(
    adminConnection,
    { body: adminLoginData },
  );
  typia.assert(adminAuth);
  // Create new connection for authenticated admin
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 8. Retrieve images for the review using admin credentials
  const retrievedImages = typia.assert<IEcommerceMallReviewImage[]>(
    await api.functional.ecommerceMall.reviews.images.at(
      adminAuthenticatedConnection,
      {
        reviewId: review.id,
      },
    ),
  );
  // 9-12. Validate the response
  TestValidator.equals("image count matches", retrievedImages.length, 3);
  // Verify each image has expected properties
  retrievedImages.forEach((image) => {
    // Check image properties
    TestValidator.predicate(
      "image has id",
      () => typeof image.id === "string" && image.id.length > 0,
    );
    TestValidator.predicate(
      "image has image_url",
      () =>
        typeof image.image_url === "string" &&
        image.image_url.startsWith("https://example.com/review-image-"),
    );
    TestValidator.predicate(
      "image has sort_order",
      () => typeof image.sort_order === "number",
    );
    TestValidator.predicate(
      "image has created_at",
      () => typeof image.created_at === "string" && image.created_at.length > 0,
    );
    TestValidator.predicate(
      "image has updated_at",
      () => typeof image.updated_at === "string" && image.updated_at.length > 0,
    );
    // Verify review references
    if (image.review) {
      TestValidator.equals(
        "image review id matches",
        image.review.id,
        review.id,
      );
    }
  });
  // 13. Confirm that administrators can view review images regardless of authorship or product ownership
  // This is validated by successful retrieval using admin credentials
  TestValidator.predicate(
    "admin can view review images",
    () => retrievedImages.length > 0,
  );
}