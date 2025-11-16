import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that an admin can perform advanced review search with multiple
 * criteria, including product, SKU, customer, moderation status, keyword, date
 * range, and rating range.
 *
 * 1. Register a new admin and ensure authentication is established.
 * 2. Perform an advanced review search with various query filters (IDs, status,
 *    keyword, rating, date) and validate results only match the defined
 *    criteria.
 * 3. Ensure pagination and sorting return proper pages of results over more
 *    reviews than page size.
 * 4. Edge case: search by a nonsensical keyword returns empty results.
 * 5. Validate summary data relationships for customer, product, SKU, rating, and
 *    order item.
 * 6. Mix of drafts, withdrawn, and moderated reviews are accessible as filtered.
 */
export async function test_api_product_review_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword1!",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);
  // 2. Perform a basic search - no criteria, expect 1st page of reviews (could be empty)
  const firstPage = await api.functional.shoppingMall.admin.reviews.index(
    connection,
    {
      body: {
        limit: 5,
        page: 1,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination structure present",
    !!firstPage.pagination && typeof firstPage.pagination.current === "number",
  );
  TestValidator.predicate("data is array", Array.isArray(firstPage.data));
  // 3. Search by random keyword should return empty page (assuming unlikely random word)
  const notFound = await api.functional.shoppingMall.admin.reviews.index(
    connection,
    {
      body: {
        keyword: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 7,
          wordMax: 10,
        }),
        limit: 5,
        page: 1,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(notFound);
  TestValidator.equals(
    "search with random keyword returns no results",
    notFound.data.length,
    0,
  );
  // 4. Use sample from initial result to form advanced search
  if (firstPage.data.length > 0) {
    const sample = firstPage.data[0];
    const sampleDate = sample.created_at;
    const advanced = await api.functional.shoppingMall.admin.reviews.index(
      connection,
      {
        body: {
          shopping_mall_product_id: sample.product.id,
          shopping_mall_product_sku_id: sample.productSku.id,
          shopping_mall_customer_id: sample.customer.id,
          moderation_status: sample.moderation_status,
          keyword: sample.title.split(" ")[0], // use word from title
          min_rating: sample.productRating
            ? sample.productRating.value
            : undefined,
          max_rating: sample.productRating
            ? sample.productRating.value
            : undefined,
          created_after: sampleDate,
          created_before: sampleDate,
          limit: 2,
          page: 1,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(advanced);
    // Results must match all filters
    for (const review of advanced.data) {
      TestValidator.equals(
        "product id matches",
        review.product.id,
        sample.product.id,
      );
      TestValidator.equals(
        "sku id matches",
        review.productSku.id,
        sample.productSku.id,
      );
      TestValidator.equals(
        "customer id matches",
        review.customer.id,
        sample.customer.id,
      );
      TestValidator.equals(
        "moderation status matches",
        review.moderation_status,
        sample.moderation_status,
      );
      if (sample.productRating)
        TestValidator.equals(
          "rating matches",
          review.productRating.value,
          sample.productRating.value,
        );
      TestValidator.predicate(
        "created_at in requested range",
        review.created_at === sampleDate,
      );
      TestValidator.predicate(
        "title includes keyword",
        review.title.includes(sample.title.split(" ")[0]),
      );
      // Relationships present
      typia.assert(review.customer);
      typia.assert(review.product);
      typia.assert(review.productSku);
      typia.assert(review.orderItem);
    }
  }
  // 5. Search for only drafts and withdrawn reviews using filters (may be 0)
  const drafts = await api.functional.shoppingMall.admin.reviews.index(
    connection,
    {
      body: {
        is_draft: true,
        withdrawn: false,
        limit: 3,
        page: 1,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(drafts);
  for (const draft of drafts.data)
    TestValidator.predicate("is draft review", draft.is_draft === true);
  const withdrawn = await api.functional.shoppingMall.admin.reviews.index(
    connection,
    {
      body: {
        withdrawn: true,
        limit: 3,
        page: 1,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(withdrawn);
  for (const w of withdrawn.data)
    TestValidator.predicate(
      "is withdrawn review",
      w.is_draft === false && w.moderation_status === "withdrawn",
    );
  // 6. Pagination: request more than 1 page if possible
  const pageSize = 2;
  const multiPage = await api.functional.shoppingMall.admin.reviews.index(
    connection,
    {
      body: { limit: pageSize, page: 1 } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(multiPage);
  // If multiple pages possible, get second page and ensure no duplicate IDs
  if (multiPage.pagination.pages > 1) {
    const page2 = await api.functional.shoppingMall.admin.reviews.index(
      connection,
      {
        body: {
          limit: pageSize,
          page: 2,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(page2);
    const page1Ids = multiPage.data.map((r) => r.id);
    for (const review of page2.data)
      TestValidator.predicate(
        "not duplicate in page1",
        !page1Ids.includes(review.id),
      );
  }
}
