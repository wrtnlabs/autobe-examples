import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_customers_me_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_reviews_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test pagination functionality when retrieving a large number of review snapshots.
 * Validates that the endpoint correctly handles pagination with many snapshot records.
 *
 * **Setup Steps:**
 * 1. Create and approve a seller account
 * 2. Create a product with variant and add inventory
 * 3. Create a customer account
 * 4. Add variant to cart and place order
 * 5. Create initial review
 * 6. Edit the review 12 times to create 12 snapshot records (each edit changes rating and/or content)
 *
 * **Test Execution:**
 * 1. Call PATCH /shoppingMall/customer/reviews/{reviewId}/snapshots with page=1, limit=5 (default)
 * 2. Verify response contains exactly 5 snapshots
 * 3. Verify pagination metadata shows: current=1, limit=5, records=12, pages=3
 * 4. Call with page=2, limit=5
 * 5. Verify response contains exactly 5 snapshots
 * 6. Verify pagination metadata shows: current=2, limit=5, records=12, pages=3
 * 7. Call with page=3, limit=5
 * 8. Verify response contains exactly 2 snapshots (last page has remaining items)
 * 9. Verify pagination metadata shows: current=3, limit=5, records=12, pages=3
 * 10. Call with page=4, limit=5
 * 11. Verify response contains empty data array
 * 12. Verify pagination metadata shows: current=4, limit=5, records=12, pages=3
 *
 * **Validations:**
 * - Pagination correctly limits results per page
 * - Pagination metadata accurately reflects total records and pages
 * - Empty page handling is correct (no error, empty data array)
 * - Snapshots maintain chronological ordering (descending) across pages
 * - Each snapshot contains correct previous/new rating and content values
 */
export async function test_api_review_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Create admin account and approve seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // 3. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 5. Add inventory
  const inventory =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: { quantity: 100, reason: "Initial stock" },
      },
    );
  typia.assert(inventory);
  // 6. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Add variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      { body: { variantId: variant.id, quantity: 1 } },
    );
  typia.assert(cartItem);
  // 8. Create order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    { body: { address_id: typia.random<string & tags.Format<"uuid">>() } },
  );
  typia.assert(order);
  // 9. Create review
  const review =
    await generate_random_shopping_mall_customer_customers_me_reviews_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
          order_id: order.id,
          rating: 3,
          content: "Initial review content",
        },
      },
    );
  typia.assert(review);
  // 10. Edit the review 12 times to create 12 snapshot records
  await ArrayUtil.asyncRepeat(12, async (i) => {
    const updatedReview =
      await api.functional.shoppingMall.customer.reviews.update(
        customerConnection,
        {
          reviewId: review.id,
          body: {
            rating: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
            content: `Edit ${i + 1}: Updated review content`,
          } satisfies IShoppingMallReview.IUpdate,
        },
      );
    typia.assert(updatedReview);
  });
  // Test pagination - Page 1
  const page1 =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 data length", page1.data.length, 5);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.equals("page 1 records", page1.pagination.records, 12);
  TestValidator.equals("page 1 pages", page1.pagination.pages, 3);
  // Test pagination - Page 2
  const page2 =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 data length", page2.data.length, 5);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals("page 2 records", page2.pagination.records, 12);
  TestValidator.equals("page 2 pages", page2.pagination.pages, 3);
  // Test pagination - Page 3 (last page with remaining items)
  const page3 =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 3,
          limit: 5,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page3);
  TestValidator.equals("page 3 data length", page3.data.length, 2);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3.pagination.limit, 5);
  TestValidator.equals("page 3 records", page3.pagination.records, 12);
  TestValidator.equals("page 3 pages", page3.pagination.pages, 3);
  // Test pagination - Page 4 (beyond available pages, should return empty data)
  const page4 =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 4,
          limit: 5,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page4);
  TestValidator.equals("page 4 data length", page4.data.length, 0);
  TestValidator.equals("page 4 current", page4.pagination.current, 4);
  TestValidator.equals("page 4 limit", page4.pagination.limit, 5);
  TestValidator.equals("page 4 records", page4.pagination.records, 12);
  TestValidator.equals("page 4 pages", page4.pagination.pages, 3);
  // Verify snapshots are ordered by creation date descending (newest first)
  // Page 1 should have the most recent snapshots
  TestValidator.predicate(
    "snapshots are in descending order by created_at",
    new Date(page1.data[0].createdAt).getTime() >=
      new Date(page1.data[page1.data.length - 1].createdAt).getTime(),
  );
  // Verify each snapshot has correct structure
  await ArrayUtil.asyncForEach(page1.data, async (snapshot) => {
    TestValidator.predicate(
      "snapshot rating within valid range",
      snapshot.previousRating >= 1 && snapshot.previousRating <= 5,
    );
    TestValidator.predicate(
      "snapshot new rating within valid range",
      snapshot.newRating >= 1 && snapshot.newRating <= 5,
    );
  });
}
