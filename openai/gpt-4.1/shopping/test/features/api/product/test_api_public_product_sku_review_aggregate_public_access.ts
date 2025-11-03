import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
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
import type { IShoppingReviewRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewRatingAggregate";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validate public access to SKU review aggregate summary for a product
 *
 * This test ensures that the review & rating summary (aggregate) endpoint for a
 * product SKU is accessible to any actor—including unauthenticated users—in
 * public API, and that the computations match submitted reviews.
 *
 * 1. Register and login as a seller.
 * 2. Seller creates a new product with valid catalog info (code, name,
 *    description, status, etc).
 * 3. Seller creates a SKU under the product using a valid attribute selection.
 * 4. Register a customer and login.
 * 5. (Assume order/delivery context is not enforced/tested here; focus is on
 *    public review aggregate API.)
 * 6. Customer submits a review for the SKU (with required fields: rating, comment,
 *    and valid status, min 10-char comment).
 * 7. Log out (simulate public/anonymous access).
 * 8. Call /shopping/skus/{skuId}/reviewAggregates without any authentication
 *    (blank headers) and assert that statistics match the review submitted
 *    (count, avg rating, etc).
 * 9. Attempt to fetch the review aggregate for a random non-existent SKU id and
 *    confirm that a not found error is thrown.
 */
export async function test_api_public_product_sku_review_aggregate_public_access(
  connection: api.IConnection,
) {
  // Step 1: Register and login as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: RandomGenerator.name(1),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // Step 2: Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(12);
  const product: IShoppingProduct =
    await api.functional.shopping.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://example.com/image.png",
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    });
  typia.assert(product);

  // Step 3: Seller creates a SKU under the product
  const attribute_values =
    product.attributes.length > 0
      ? [product.attributes[0].attribute_value.id]
      : [typia.random<string & tags.Format<"uuid">>()];
  const skuCode = RandomGenerator.alphaNumeric(10);
  const sku: IShoppingSku =
    await api.functional.shopping.seller.products.skus.create(connection, {
      productCode: product.code,
      body: {
        sku_code: skuCode,
        price: typia.random<number>(),
        is_active: true,
        barcode: null,
        status: "in_stock",
        variant_attribute_value_ids: attribute_values,
      } satisfies IShoppingSku.ICreate,
    });
  typia.assert(sku);

  // Step 4: Register and login as customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://test-site.com/register",
        referrer: "https://test-site.com/",
        ip: null,
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 5: Assume SKU/order lines are eligible for review (this API requires correct ids)
  // Step 6: Customer submits review for SKU
  // We must set shopping_order_line_id to a unique value for test; assume test infra allows it
  const fakeOrderLineId = typia.random<string & tags.Format<"uuid">>();
  const rating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 4;
  const comment = RandomGenerator.paragraph({ sentences: 3, wordMin: 5 });
  const review: IShoppingReview =
    await api.functional.shopping.customer.reviews.create(connection, {
      body: {
        shopping_sku_id: sku.id,
        shopping_order_line_id: fakeOrderLineId,
        rating,
        comment,
      } satisfies IShoppingReview.ICreate,
    });
  typia.assert(review);
  TestValidator.equals(
    "review rating returned is correct",
    review.rating,
    rating,
  );
  TestValidator.equals("review sku id matches", review.sku.id, sku.id);
  TestValidator.equals("review comment matches", review.comment, comment);

  // Step 7: Simulate anonymous (public) access for review aggregates
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  // Step 8: Call SKU reviewAggregates endpoint with public/blank headers
  const aggregate: IShoppingReviewRatingAggregate =
    await api.functional.shopping.skus.reviewAggregates.at(unauthConn, {
      skuId: sku.id,
    });
  typia.assert(aggregate);
  TestValidator.equals(
    "skuId in aggregate matches",
    aggregate.shopping_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "review aggregate for single review count",
    aggregate.review_count,
    1,
  );
  TestValidator.equals(
    "review aggregate average rating matches",
    aggregate.average_rating,
    rating,
  );
  // These statistics should match input with one review

  // Step 9: Attempt to fetch for a non-existent skuId
  await TestValidator.error(
    "not found is thrown for non-existent SKU",
    async () => {
      await api.functional.shopping.skus.reviewAggregates.at(unauthConn, {
        skuId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
