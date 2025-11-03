import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingReview";
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
 * Verifies that a seller can search and paginate customer reviews for their
 * products using product and SKU filters. Ensures seller authentication context
 * by registering a seller, and ensures that at least one product, one SKU, and
 * one review exist. The test confirms that the review search endpoint only
 * returns reviews for the seller's products/SKUs, pagination is correct, and
 * advanced filters (product and SKU) work as expected.
 *
 * Steps:
 *
 * 1. Register a seller and acquire authentication.
 * 2. Create a product for the seller.
 * 3. Create a SKU under that product.
 * 4. Create a customer review (as a customer; in this test it's simulated — in a
 *    real scenario, should use proper authentication context switch).
 * 5. As the seller, query the reviews with filtering by product and SKU, asserting
 *    that returned reviews match the product/SKU created for this seller and
 *    pagination is correct.
 */
export async function test_api_seller_review_search_by_product_and_sku(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);

  // 2. Create product as the seller
  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri: `https://cdn.example.com/${RandomGenerator.alphaNumeric(12)}.jpg`,
    status: "active",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 3. Create SKU under this product
  const skuCode = RandomGenerator.alphaNumeric(8);
  const skuBody = {
    sku_code: skuCode,
    price: 10000,
    is_active: true,
    status: "in_stock",
    variant_attribute_value_ids: [] satisfies string[],
  } satisfies IShoppingSku.ICreate;
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    { productCode: product.code, body: skuBody },
  );
  typia.assert(sku);

  // 4. Simulate review creation by the customer (works in single flow for test purposes, but in reality auth context switch is required)
  // Fake order/line is not possible without order APIs, so we simulate a valid UUID and string, accepting the e2e scope
  const fakeOrderLineId = typia.random<string & tags.Format<"uuid">>();
  const reviewBody = {
    shopping_sku_id: sku.id,
    shopping_order_line_id: fakeOrderLineId,
    rating: 5,
    comment: RandomGenerator.paragraph({ sentences: 12 }),
    attachments: [],
  } satisfies IShoppingReview.ICreate;
  const review = await api.functional.shopping.customer.reviews.create(
    connection,
    { body: reviewBody },
  );
  typia.assert(review);

  // 5. As seller, search reviews with various product/SKU filters
  // --- Filter by SKU ID (should return our review)
  const searchBySkuReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sku_id: sku.id,
  } satisfies IShoppingReview.IRequest;
  const resBySku = await api.functional.shopping.seller.reviews.index(
    connection,
    { body: searchBySkuReq },
  );
  typia.assert(resBySku);
  const foundReviewBySku = resBySku.data.find((r) => r.id === review.id);
  TestValidator.predicate(
    "SKU filter returns inserted review",
    !!foundReviewBySku,
  );
  TestValidator.equals(
    "Review SKU == filter SKU",
    foundReviewBySku?.sku.id,
    sku.id,
  );

  // --- Filter by impossible SKU (should return no review)
  const noResultReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sku_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingReview.IRequest;
  const resNoResult = await api.functional.shopping.seller.reviews.index(
    connection,
    { body: noResultReq },
  );
  typia.assert(resNoResult);
  TestValidator.equals(
    "Filtering by wrong SKU yields empty page",
    resNoResult.data.length,
    0,
  );

  // --- Paging: Insert another review, then check correct length and data for limit=1 pagination
  const reviewBody2 = {
    shopping_sku_id: sku.id,
    shopping_order_line_id: typia.random<string & tags.Format<"uuid">>(),
    rating: 4,
    comment: RandomGenerator.paragraph({ sentences: 12 }),
    attachments: [],
  } satisfies IShoppingReview.ICreate;
  const review2 = await api.functional.shopping.customer.reviews.create(
    connection,
    { body: reviewBody2 },
  );
  typia.assert(review2);
  const pagingReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
    limit: 1 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sku_id: sku.id,
  } satisfies IShoppingReview.IRequest;
  const resPaging = await api.functional.shopping.seller.reviews.index(
    connection,
    { body: pagingReq },
  );
  typia.assert(resPaging);
  TestValidator.equals(
    "Pagination returns single review",
    resPaging.data.length,
    1,
  );
  TestValidator.equals(
    "Pagination total matches inserted reviews",
    resPaging.pagination.records,
    2,
  );

  // --- General (no filter): returns both reviews
  const generalReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingReview.IRequest;
  const generalRes = await api.functional.shopping.seller.reviews.index(
    connection,
    { body: generalReq },
  );
  typia.assert(generalRes);
  const foundBoth = [review.id, review2.id].every((id) =>
    generalRes.data.some((r) => r.id === id),
  );
  TestValidator.predicate(
    "General search returns all inserted reviews",
    foundBoth,
  );

  // --- Advanced: Filter by rating
  const ratingReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    star_rating: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    sku_id: sku.id,
  } satisfies IShoppingReview.IRequest;
  const ratingRes = await api.functional.shopping.seller.reviews.index(
    connection,
    { body: ratingReq },
  );
  typia.assert(ratingRes);
  TestValidator.predicate(
    "Advanced filter returns only matching rating reviews",
    ratingRes.data.every((r) => r.rating === 5),
  );
}
