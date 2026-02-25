import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
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
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_product_reviews_search_and_verified(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test product reviews listing with text search and verified purchase indicator
  // 1. Complete full order-to-review workflow for multiple customers
  // 2. Create reviews with different content patterns for search testing
  // 3. Test text search on review content (ILIKE case-insensitive)
  // 4. Test combined search with filters
  // 5. Test verified purchase indicator
  // 6. Test null content handling (rating-only reviews)
  // 7. Test sorting options
  // 1. Setup: Create admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create and approve seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // Re-login seller after approval
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "12345678",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 3. Create product with variant and inventory
  const product = await generate_random_shopping_mall_seller_products_create(
    approvedSellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: 50000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      approvedSellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 45000,
          optionValues: [{ key: "color", value: "Black" }],
          stockQuantity: 100,
        },
      },
    );
  // 4. Create multiple customers and complete order-to-review workflow
  const reviewData: Array<{
    content: string | null;
    rating: number;
    productId: string;
  }> = [
    {
      content: "Excellent quality and fast shipping",
      rating: 5,
      productId: product.id,
    },
    { content: "Great value for money", rating: 4, productId: product.id },
    { content: "Good product overall", rating: 4, productId: product.id },
    { content: null, rating: 5, productId: product.id }, // Rating-only review
    { content: "Quality is amazing", rating: 5, productId: product.id },
  ];
  const createdReviews: IShoppingMallReview[] = [];
  for (let i = 0; i < reviewData.length; i++) {
    const reviewItem = reviewData[i];
    // Create customer
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {});
    // Add to cart
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 1,
        },
      },
    );
    // Place order (need address_id - using random UUID for test)
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          address_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
    // Seller ships the order
    const shipment =
      await generate_random_shopping_mall_seller_sellers_me_shipments_create(
        approvedSellerConnection,
        {
          body: {
            orderItemIds: order.orderItems.map((item) => item.id),
            carrierName: "FedEx",
            trackingNumber: `TRACK-${RandomGenerator.alphaNumeric(10)}`,
          },
        },
      );
    // Customer confirms delivery
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
    // Customer creates review
    const review =
      await generate_random_shopping_mall_customer_customers_me_reviews_create(
        customerConnection,
        {
          body: {
            product_id: reviewItem.productId,
            order_id: order.id,
            rating: reviewItem.rating,
            content: reviewItem.content,
          },
        },
      );
    createdReviews.push(review);
  }
  // 5. Test: Text search on review content
  const searchResult1 =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: { search: "excellent" },
    });
  typia.assert(searchResult1);
  // Verify only reviews containing "excellent" are returned
  TestValidator.predicate(
    "search results contain 'excellent'",
    searchResult1.data.every(
      (r) =>
        r.content !== null && r.content.toLowerCase().includes("excellent"),
    ),
  );
  // 6. Test: Combined search with filters
  const searchResult2 =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: { search: "quality", rating_min: 4 },
    });
  typia.assert(searchResult2);
  TestValidator.predicate(
    "combined filter results contain 'quality' and rating >= 4",
    searchResult2.data.every(
      (r) =>
        r.content !== null &&
        r.content.toLowerCase().includes("quality") &&
        r.rating >= 4,
    ),
  );
  // 7. Test: Verified purchase indicator
  const allReviews = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId: product.id,
      body: { limit: 100 },
    },
  );
  typia.assert(allReviews);
  // All reviews should have verified = true (reviews can only be written by verified purchasers)
  TestValidator.predicate(
    "all reviews have verified purchase indicator",
    allReviews.data.every((r) => r.verified === true),
  );
  // 8. Test: Null content handling (rating-only reviews appear in listings)
  const nullContentReviews = allReviews.data.filter((r) => r.content === null);
  TestValidator.predicate(
    "rating-only reviews are included in listings",
    nullContentReviews.length > 0,
  );
  // 9. Test: Sorting by created_at descending (newest first)
  const sortedDesc = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId: product.id,
      body: { sort: "created_at", order: "desc" },
    },
  );
  typia.assert(sortedDesc);
  // Verify descending order
  for (let i = 0; i < sortedDesc.data.length - 1; i++) {
    TestValidator.predicate(
      "sorted descending by created_at",
      new Date(sortedDesc.data[i].created_at) >=
        new Date(sortedDesc.data[i + 1].created_at),
    );
  }
  // 10. Test: Sorting by created_at ascending (oldest first)
  const sortedAsc = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId: product.id,
      body: { sort: "created_at", order: "asc" },
    },
  );
  typia.assert(sortedAsc);
  // Verify ascending order
  for (let i = 0; i < sortedAsc.data.length - 1; i++) {
    TestValidator.predicate(
      "sorted ascending by created_at",
      new Date(sortedAsc.data[i].created_at) <=
        new Date(sortedAsc.data[i + 1].created_at),
    );
  }
  // 11. Test: Pagination
  const page1 = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId: product.id,
      body: { page: 1, limit: 2 },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.predicate("page 1 has at most 2 items", page1.data.length <= 2);
}