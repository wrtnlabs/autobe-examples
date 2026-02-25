import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewEdit";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewEdit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_customer_products_reviews_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";

/**
 * Test complex multi-filter scenarios combining date ranges, rating changes, and content searches.
 * Create review with edits occurring at different times with varying rating changes and content modifications.
 * Test combined filters: specific date range + exact rating transition + content keyword search.
 * Validate edge cases: empty result sets when no matches, partial matches for some criteria, and exact matches for all criteria.
 * Verify response pagination handles various result sizes and filters apply correctly in conjunction with each other.
 */
export async function test_api_review_edit_complex_multifilter_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create seller connection and product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create customer connection and initial review
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Create initial review
  const initialReviewResponse =
    await api.functional.ecommerce.customer.products.reviews.create(
      customerConnection,
      {
        productId: product.id,
        body: {
          rating: 3 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          content:
            "Initial review content with keyword search" satisfies string &
              tags.MaxLength<5000>,
        } satisfies IEcommerceReview.ICreate,
      },
    );
  const initialReview = typia.assert<IEntity>(initialReviewResponse);
  // Create multiple edits with different timestamps and content
  const edits: IEcommerceReviewEdit.ISummary[] = [];
  // Edit 1: Rating change 3→5 with content modification
  await new Promise((resolve) => setTimeout(resolve, 100));
  const edit1 = await api.functional.ecommerce.customer.products.reviews.update(
    customerConnection,
    {
      productId: product.id,
      reviewId: initialReview.id,
      body: {
        rating: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        content: "Updated content with important keyword" satisfies string &
          tags.MaxLength<5000>,
      } satisfies IEcommerceReview.IUpdate,
    },
  );
  typia.assert(edit1);
  // Edit 2: Rating change 5→2 with different content
  await new Promise((resolve) => setTimeout(resolve, 100));
  const edit2 = await api.functional.ecommerce.customer.products.reviews.update(
    customerConnection,
    {
      productId: product.id,
      reviewId: initialReview.id,
      body: {
        rating: 2 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        content: "Different content without keyword" satisfies string &
          tags.MaxLength<5000>,
      } satisfies IEcommerceReview.IUpdate,
    },
  );
  typia.assert(edit2);
  // Edit 3: Rating change 2→4 with keyword content
  await new Promise((resolve) => setTimeout(resolve, 100));
  const edit3 = await api.functional.ecommerce.customer.products.reviews.update(
    customerConnection,
    {
      productId: product.id,
      reviewId: initialReview.id,
      body: {
        rating: 4 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        content: "Final content with keyword search again" satisfies string &
          tags.MaxLength<5000>,
      } satisfies IEcommerceReview.IUpdate,
    },
  );
  typia.assert(edit3);
  // Test 1: Filter by date range only
  const dateFiltered =
    await api.functional.ecommerce.administrator.reviews.edits.index(
      adminConnection,
      {
        reviewId: initialReview.id,
        body: {
          edited_at_start: new Date(Date.now() - 1000).toISOString(),
          edited_at_end: new Date(Date.now() + 1000).toISOString(),
        } satisfies IEcommerceReviewEdit.IRequest,
      },
    );
  typia.assert(dateFiltered);
  TestValidator.equals(
    "date filter returns all edits",
    dateFiltered.data.length,
    3,
  );
  // Test 2: Filter by rating transition (3→5)
  const ratingFiltered =
    await api.functional.ecommerce.administrator.reviews.edits.index(
      adminConnection,
      {
        reviewId: initialReview.id,
        body: {
          rating_before: 3 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          rating_after: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
        } satisfies IEcommerceReviewEdit.IRequest,
      },
    );
  typia.assert(ratingFiltered);
  TestValidator.equals(
    "rating transition filter returns exact match",
    ratingFiltered.data.length,
    1,
  );
  TestValidator.equals(
    "rating before matches",
    ratingFiltered.data[0].rating_before,
    3,
  );
  TestValidator.equals(
    "rating after matches",
    ratingFiltered.data[0].rating_after,
    5,
  );
  // Test 3: Filter by content containing keyword
  const contentFiltered =
    await api.functional.ecommerce.administrator.reviews.edits.index(
      adminConnection,
      {
        reviewId: initialReview.id,
        body: {
          content_contains: "keyword",
        } satisfies IEcommerceReviewEdit.IRequest,
      },
    );
  typia.assert(contentFiltered);
  TestValidator.predicate(
    "content filter returns partial matches",
    contentFiltered.data.length >= 2,
  );
  // Test 4: Combined filter - date range + rating transition + content
  const combinedFiltered =
    await api.functional.ecommerce.administrator.reviews.edits.index(
      adminConnection,
      {
        reviewId: initialReview.id,
        body: {
          edited_at_start: new Date(Date.now() - 1000).toISOString(),
          edited_at_end: new Date(Date.now() + 1000).toISOString(),
          rating_before: 3 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          rating_after: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          content_contains: "keyword",
        } satisfies IEcommerceReviewEdit.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.equals(
    "combined filter returns exact match",
    combinedFiltered.data.length,
    1,
  );
  // Test 5: Empty result set - impossible filter combination
  const emptyFiltered =
    await api.functional.ecommerce.administrator.reviews.edits.index(
      adminConnection,
      {
        reviewId: initialReview.id,
        body: {
          rating_before: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          rating_after: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
        } satisfies IEcommerceReviewEdit.IRequest,
      },
    );
  typia.assert(emptyFiltered);
  TestValidator.equals(
    "impossible filter returns empty set",
    emptyFiltered.data.length,
    0,
  );
  // Test 6: Pagination with filters
  const paginatedFiltered =
    await api.functional.ecommerce.administrator.reviews.edits.index(
      adminConnection,
      {
        reviewId: initialReview.id,
        body: {
          content_contains: "keyword",
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceReviewEdit.IRequest,
      },
    );
  typia.assert(paginatedFiltered);
  TestValidator.predicate(
    "pagination limit works",
    paginatedFiltered.data.length <= 2,
  );
  TestValidator.equals(
    "pagination metadata present",
    paginatedFiltered.pagination.current,
    1,
  );
  // Test 7: Validate edit history integrity
  const allEdits =
    await api.functional.ecommerce.administrator.reviews.edits.index(
      adminConnection,
      {
        reviewId: initialReview.id,
        body: {} satisfies IEcommerceReviewEdit.IRequest,
      },
    );
  typia.assert(allEdits);
  TestValidator.equals("all edits captured", allEdits.data.length, 3);
  // Validate chronological order
  for (let i = 1; i < allEdits.data.length; i++) {
    const prevEdit = new Date(allEdits.data[i - 1].edited_at);
    const currEdit = new Date(allEdits.data[i].edited_at);
    TestValidator.predicate("edits are chronological", prevEdit <= currEdit);
  }
}
