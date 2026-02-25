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

export async function test_api_review_snapshot_history_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // Setup: Create and approve seller account
  // ========================================
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
    },
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create admin and approve seller
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(connection, {
    body: { password: adminPassword },
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // ========================================
  // Setup: Create product with variant and inventory
  // ========================================
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: { quantity: 100, reason: "Initial stock for test" },
    },
  );
  // ========================================
  // Setup: Create customer account
  // ========================================
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(connection, {
    body: { password: customerPassword },
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ========================================
  // Setup: Add to cart and place order
  // ========================================
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      { body: { variantId: variant.id, quantity: 1 } },
    );
  typia.assert(cartItem);
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // ========================================
  // Setup: Create initial review (3 stars)
  // ========================================
  const review =
    await generate_random_shopping_mall_customer_customers_me_reviews_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
          order_id: order.id,
          rating: 3,
          content: "Good product",
        },
      },
    );
  typia.assert(review);
  // ========================================
  // First Edit: 3 stars -> 4 stars
  // ========================================
  const updatedReview1 =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: 4,
          content: "Very good product",
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview1);
  // ========================================
  // Second Edit: 4 stars -> 5 stars
  // ========================================
  const updatedReview2 =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: 5,
          content: "Excellent product, highly recommended!",
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview2);
  // ========================================
  // Test: Retrieve snapshot history
  // ========================================
  const snapshots =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // ========================================
  // Verify pagination metadata
  // ========================================
  TestValidator.equals("pagination current", snapshots.pagination.current, 1);
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 10);
  TestValidator.equals("total snapshots", snapshots.pagination.records, 2);
  TestValidator.equals("total pages", snapshots.pagination.pages, 1);
  // ========================================
  // Verify snapshot count
  // ========================================
  TestValidator.equals("snapshot count", snapshots.data.length, 2);
  // ========================================
  // Verify chronological order (newest first)
  // ========================================
  const firstSnapshot = snapshots.data[0]!;
  const secondSnapshot = snapshots.data[1]!;
  TestValidator.predicate(
    "first snapshot is newer",
    new Date(firstSnapshot.createdAt).getTime() >=
      new Date(secondSnapshot.createdAt).getTime(),
  );
  // ========================================
  // Verify first snapshot (4 -> 5 stars)
  // ========================================
  TestValidator.equals(
    "first snapshot previous rating",
    firstSnapshot.previousRating,
    4,
  );
  TestValidator.equals("first snapshot new rating", firstSnapshot.newRating, 5);
  TestValidator.equals(
    "first snapshot previous content",
    firstSnapshot.previousContent,
    "Very good product",
  );
  TestValidator.equals(
    "first snapshot new content",
    firstSnapshot.newContent,
    "Excellent product, highly recommended!",
  );
  // ========================================
  // Verify second snapshot (3 -> 4 stars)
  // ========================================
  TestValidator.equals(
    "second snapshot previous rating",
    secondSnapshot.previousRating,
    3,
  );
  TestValidator.equals(
    "second snapshot new rating",
    secondSnapshot.newRating,
    4,
  );
  TestValidator.equals(
    "second snapshot previous content",
    secondSnapshot.previousContent,
    "Good product",
  );
  TestValidator.equals(
    "second snapshot new content",
    secondSnapshot.newContent,
    "Very good product",
  );
}
