import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_review_snapshot_pagination_chronological_order(
  connection: api.IConnection,
): Promise<void> {
  // Setup Phase: Create seller and product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Setup Phase: Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Setup Phase: Create shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    { body: { is_default: true } },
  );
  typia.assert(address);
  // Setup Phase: Create order via checkout
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    { body: { address_id: address.id } },
  );
  typia.assert(order);
  // Setup Phase: Create review for the purchased product
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: typia.random<number & tags.Minimum<1> & tags.Maximum<5>>(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
      },
    },
  );
  typia.assert(review);
  // Test Phase: Call snapshots endpoint with pagination
  const page1 =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 3,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // Verify pagination metadata structure
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 3);
  TestValidator.predicate("page 1 records >= 0", page1.pagination.records >= 0);
  TestValidator.predicate("page 1 pages >= 0", page1.pagination.pages >= 0);
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1.data.length <= 3,
  );
  // Verify chronological order (oldest first) for page 1 snapshots
  if (page1.data.length > 1) {
    for (let i = 1; i < page1.data.length; i++) {
      const prevCreatedAt = new Date(page1.data[i - 1].created_at).getTime();
      const currCreatedAt = new Date(page1.data[i].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} timestamp >= snapshot ${i - 1} timestamp`,
        currCreatedAt >= prevCreatedAt,
      );
    }
  }
  // If multiple pages exist, fetch and verify page 2
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.shoppingMall.customer.reviews.snapshots.index(
        customerConnection,
        {
          reviewId: review.id,
          body: {
            page: 2,
            limit: 3,
          } satisfies IShoppingMallReviewSnapshot.IRequest,
        },
      );
    typia.assert(page2);
    // Verify page 2 metadata
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2.pagination.limit, 3);
    // Verify chronological continuity across pages
    if (page1.data.length > 0 && page2.data.length > 0) {
      const lastPage1CreatedAt = new Date(
        page1.data[page1.data.length - 1].created_at,
      ).getTime();
      const firstPage2CreatedAt = new Date(page2.data[0].created_at).getTime();
      TestValidator.predicate(
        "page 2 first snapshot >= page 1 last snapshot",
        firstPage2CreatedAt >= lastPage1CreatedAt,
      );
    }
    // Verify chronological order within page 2
    if (page2.data.length > 1) {
      for (let i = 1; i < page2.data.length; i++) {
        const prevCreatedAt = new Date(page2.data[i - 1].created_at).getTime();
        const currCreatedAt = new Date(page2.data[i].created_at).getTime();
        TestValidator.predicate(
          `page 2 snapshot ${i} timestamp >= snapshot ${i - 1} timestamp`,
          currCreatedAt >= prevCreatedAt,
        );
      }
    }
  }
  // Test with larger page size
  const largePage =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(largePage);
  // Verify pagination metadata for large page
  TestValidator.equals("large page current", largePage.pagination.current, 1);
  TestValidator.predicate(
    "large page data length <= 20",
    largePage.data.length <= 20,
  );
  // Verify total records consistency across different page sizes
  TestValidator.equals(
    "total records consistent across page sizes",
    page1.pagination.records,
    largePage.pagination.records,
  );
  // Verify all snapshots in large page are chronologically ordered
  if (largePage.data.length > 1) {
    for (let i = 1; i < largePage.data.length; i++) {
      const prevCreatedAt = new Date(
        largePage.data[i - 1].created_at,
      ).getTime();
      const currCreatedAt = new Date(largePage.data[i].created_at).getTime();
      TestValidator.predicate(
        `large page snapshot ${i} timestamp >= snapshot ${i - 1} timestamp`,
        currCreatedAt >= prevCreatedAt,
      );
    }
  }
}
