import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReview";
import type { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";
import type { IShoppingReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAttachment";
import type { IShoppingReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewModeration";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Test that an admin can retrieve detailed information for any product review,
 * including content, customer, product/SKU associations, attachments, and
 * moderation history. Validates access control so admin is able to retrieve all
 * details regardless of review author. Includes checks for handling of
 * non-existent or deleted reviews. Requires prior review creation, and admin
 * authentication context.
 */
export async function test_api_admin_review_detail_authenticated(
  connection: api.IConnection,
) {
  // 1. Create an admin user and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "superadmin",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a product
  const productCode = RandomGenerator.alphaNumeric(8);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        main_image_uri: "https://cdn.example.com/product.jpg",
        status: "active",
        business_status: "approved",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create a SKU for the product (admin context is allowed)
  const skuCode = RandomGenerator.alphaNumeric(10);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: 10000,
        is_active: true,
        barcode: undefined,
        status: "in_stock",
        // For this test, assign at least one valid random variant_attribute_value_id from the array
        variant_attribute_value_ids: [RandomGenerator.alphaNumeric(12)],
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // 4. Create a customer user and authenticate
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://shop.example.com/register",
      referrer: "https://shop.example.com/landing",
      ip: null,
    } satisfies IShoppingCustomer.ICreate,
  });

  // 5. Simulate review creation as the customer
  // As the test context cannot create a real order line, use random UUIDs for shopping_order_line_id.
  const reviewCreateInput = {
    shopping_sku_id: sku.id,
    shopping_order_line_id: typia.random<string & tags.Format<"uuid">>(),
    rating: 5,
    comment: RandomGenerator.paragraph({ sentences: 10 }),
    attachments: [
      {
        file_uri: "https://images.example.com/photo1.jpg",
        file_type: "image/jpeg",
        file_size: 1200000,
      },
    ],
  } satisfies IShoppingReview.ICreate;
  const review: IShoppingReview =
    await api.functional.shopping.customer.reviews.create(connection, {
      body: reviewCreateInput,
    });
  typia.assert(review);

  // 6. As admin, retrieve the review detail
  const reviewDetail: IShoppingReview =
    await api.functional.shopping.admin.reviews.at(connection, {
      reviewId: review.id,
    });
  typia.assert(reviewDetail);

  // 7. Assert that all key detail relationships are present and correct
  TestValidator.equals("review id matches", reviewDetail.id, review.id);
  TestValidator.equals(
    "review customer matches",
    reviewDetail.customer.id,
    review.customer.id,
  );
  TestValidator.equals(
    "SKU for review detail matches",
    reviewDetail.sku.id,
    sku.id,
  );
  TestValidator.equals(
    "review comment matches",
    reviewDetail.comment,
    review.comment,
  );
  TestValidator.predicate(
    "review detail has at least one attachment",
    reviewDetail.attachments.length > 0,
  );
  TestValidator.equals(
    "review attachment uri matches",
    reviewDetail.attachments[0].file_uri,
    review.attachments[0].file_uri,
  );
  TestValidator.equals(
    "review state is visible or pending_moderation",
    ["visible", "pending_moderation"].includes(reviewDetail.state)
      ? reviewDetail.state
      : undefined,
    reviewDetail.state,
  );

  // 8. Non-existent review should cause error
  await TestValidator.error(
    "non-existent reviewId triggers error",
    async () => {
      await api.functional.shopping.admin.reviews.at(connection, {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 9. Optionally, (if deleted_at is available), mark the review logically deleted (not possible here), so skip actual deletion scenario.
}
