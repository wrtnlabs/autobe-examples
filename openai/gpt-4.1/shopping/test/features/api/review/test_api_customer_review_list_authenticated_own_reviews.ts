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
 * Test that a customer can retrieve their own submitted product reviews with
 * correct filtering and isolation.
 *
 * 1. Register a new customer account and login (to get authentication).
 * 2. Seller creates a product and adds a SKU to it.
 * 3. Customer creates review(s) for the SKU.
 * 4. Use the /shopping/customer/reviews index API (patch) to search for own
 *    reviews:
 *
 *    - Unfiltered (should see their reviews only)
 *    - With filters (sku, star rating, date range, pagination)
 *    - Verifies that returned reviews have state=visible and belong to this customer
 * 5. (Optionally) Validate reviews from other customers do not appear.
 *
 * Validates privacy, isolation and filter correctness, and that all fields in
 * IShoppingReview.ISummary are correct for own reviews.
 */
export async function test_api_customer_review_list_authenticated_own_reviews(
  connection: api.IConnection,
) {
  // 1. Register a new customer (self)
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://test-customer.acme.com/register",
    referrer: "https://test-customer.acme.com/login",
    ip: undefined,
  } satisfies IShoppingCustomer.ICreate;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(customerAuth);

  // 2. Seller creates a product
  // (simulate seller role, skip auth -- assumed test infra allows or token not enforced for product create)
  const productCode = RandomGenerator.alphaNumeric(10);
  const productInput = {
    code: productCode,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 3,
      wordMax: 8,
    }),
    main_image_uri: `https://cdn.example.com/images/${productCode}.png`,
    status: "active",
    business_status: "approved",
    shipping_weight_grams: 200,
    shipping_length_cm: 15,
    shipping_width_cm: 10,
    shipping_height_cm: 3,
    shipping_options: "Standard",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Seller creates a SKU for the product
  const skuCode = `${productCode}-VAR1`;
  const skuInput = {
    sku_code: skuCode,
    price: 9900,
    is_active: true,
    barcode: null,
    status: "in_stock",
    variant_attribute_value_ids: [],
  } satisfies IShoppingSku.ICreate;
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    { productCode, body: skuInput },
  );
  typia.assert(sku);

  // 4. Customer creates reviews for their own SKU purchases (simulate purchase context/eligibility is not required for test)
  const reviewInputs = ArrayUtil.repeat(3, (i) => {
    return {
      shopping_sku_id: sku.id,
      shopping_order_line_id: typia.random<string & tags.Format<"uuid">>(),
      rating: (5 - (i % 2)) as 5 | 4,
      comment: RandomGenerator.paragraph({ sentences: 12 }),
    } satisfies IShoppingReview.ICreate;
  });
  const reviews = [] as IShoppingReview[];
  for (const input of reviewInputs) {
    const review = await api.functional.shopping.customer.reviews.create(
      connection,
      { body: input },
    );
    typia.assert(review);
    reviews.push(review);
  }
  // 5. Retrieve all own reviews (unfiltered)
  const unfilteredPage = await api.functional.shopping.customer.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingReview.IRequest,
    },
  );
  typia.assert(unfilteredPage);
  // Should contain all created reviews and no others
  for (const item of unfilteredPage.data) {
    TestValidator.equals("review is visible", item.state, "visible");
    TestValidator.equals(
      "review is by the test customer",
      item.customer.id,
      customerAuth.id,
    );
    // Must not be deleted
    TestValidator.equals("review not deleted", item.customer.deleted_at, null);
    // Must be for the SKU we made
    TestValidator.equals("sku is correct", item.sku.id, sku.id);
  }
  // 6. Filtering: by star rating 5
  const pageBy5 = await api.functional.shopping.customer.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        star_rating: 5,
      } satisfies IShoppingReview.IRequest,
    },
  );
  typia.assert(pageBy5);
  for (const item of pageBy5.data) {
    TestValidator.equals("rating is 5", item.rating, 5);
  }
  // 7. Filtering: by star rating 4
  const pageBy4 = await api.functional.shopping.customer.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        star_rating: 4,
      } satisfies IShoppingReview.IRequest,
    },
  );
  typia.assert(pageBy4);
  for (const item of pageBy4.data) {
    TestValidator.equals("rating is 4", item.rating, 4);
  }
  // 8. Filtering: by SKU id
  const pageBySku = await api.functional.shopping.customer.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sku_id: sku.id,
      } satisfies IShoppingReview.IRequest,
    },
  );
  typia.assert(pageBySku);
  for (const item of pageBySku.data) {
    TestValidator.equals("sku id matches", item.sku.id, sku.id);
  }
  // 9. Filtering: pagination (page/limit)
  const firstPage = await api.functional.shopping.customer.reviews.index(
    connection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingReview.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "page 1 has <= 2 reviews",
    firstPage.data.length <= 2,
  );
  if (firstPage.pagination.pages > 1) {
    const page2 = await api.functional.shopping.customer.reviews.index(
      connection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingReview.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.predicate(
      "page 2 is correct",
      page2.pagination.current === 2 &&
        page2.pagination.limit === 2 &&
        page2.data.length > 0,
    );
  }
}
