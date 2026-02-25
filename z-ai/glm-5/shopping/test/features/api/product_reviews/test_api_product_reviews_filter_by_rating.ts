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

export async function test_api_product_reviews_filter_by_rating(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // SETUP: Create admin, seller, product, variant, inventory
  // ============================================================
  // Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // Create product with required fields
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 50000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // Create variant with stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10).toUpperCase(),
          optionValues: [{ key: "color", value: "Black" }],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // ============================================================
  // CREATE MULTIPLE REVIEWS WITH DIFFERENT RATINGS
  // ============================================================
  const createdReviews: IShoppingMallReview[] = [];
  const ratingDistribution = [
    { rating: 5, count: 3 },
    { rating: 4, count: 3 },
    { rating: 3, count: 2 },
    { rating: 2, count: 2 },
    { rating: 1, count: 2 },
  ];
  for (const group of ratingDistribution) {
    for (let i = 0; i < group.count; i++) {
      // Create customer
      const customerConnection: api.IConnection = { host: connection.host };
      const customer = await authorize_customer_join(customerConnection, {});
      typia.assert(customer);
      // Add variant to cart
      const cartItem =
        await generate_random_shopping_mall_customer_cart_items_create(
          customerConnection,
          {
            body: {
              variantId: variant.id,
              quantity: 1,
            },
          },
        );
      typia.assert(cartItem);
      // Place order (requires address setup - using SDK directly)
      const order = await generate_random_shopping_mall_customer_orders_create(
        customerConnection,
        {
          body: {
            address_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
      typia.assert(order);
      // Seller ships the order
      const paidItem = order.orderItems.find(
        (item) => item.status === "paid" && item.product?.id === product.id,
      );
      if (paidItem) {
        const shipment =
          await generate_random_shopping_mall_seller_sellers_me_shipments_create(
            sellerConnection,
            {
              body: {
                orderItemIds: [paidItem.id],
                carrierName: "FedEx",
                trackingNumber: RandomGenerator.alphaNumeric(12).toUpperCase(),
              },
            },
          );
        typia.assert(shipment);
        // Customer confirms delivery
        const confirmedShipment =
          await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
            customerConnection,
            { shipmentId: shipment.id },
          );
        typia.assert(confirmedShipment);
        // Create review
        const review =
          await generate_random_shopping_mall_customer_customers_me_reviews_create(
            customerConnection,
            {
              body: {
                product_id: product.id,
                order_id: order.id,
                rating: group.rating,
                content: RandomGenerator.paragraph({ sentences: 2 }),
              },
            },
          );
        typia.assert(review);
        createdReviews.push(review);
      }
    }
  }
  // ============================================================
  // TEST SCENARIO 1: Filter by minimum rating
  // ============================================================
  const minRatingResult =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: { rating_min: 4 } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(minRatingResult);
  TestValidator.predicate(
    "all reviews have rating >= 4",
    minRatingResult.data.every((r) => r.rating >= 4),
  );
  // Verify reviews with ratings 1, 2, 3 are excluded
  TestValidator.predicate(
    "no reviews with rating < 4",
    !minRatingResult.data.some((r) => r.rating < 4),
  );
  // ============================================================
  // TEST SCENARIO 2: Filter by maximum rating
  // ============================================================
  const maxRatingResult =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: { rating_max: 2 } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(maxRatingResult);
  TestValidator.predicate(
    "all reviews have rating <= 2",
    maxRatingResult.data.every((r) => r.rating <= 2),
  );
  // Verify reviews with ratings 3, 4, 5 are excluded
  TestValidator.predicate(
    "no reviews with rating > 2",
    !maxRatingResult.data.some((r) => r.rating > 2),
  );
  // ============================================================
  // TEST SCENARIO 3: Filter by rating range (3-4)
  // ============================================================
  const rangeResult = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId: product.id,
      body: {
        rating_min: 3,
        rating_max: 4,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(rangeResult);
  TestValidator.predicate(
    "all reviews have rating between 3 and 4",
    rangeResult.data.every((r) => r.rating >= 3 && r.rating <= 4),
  );
  // Verify reviews with ratings 1, 2, 5 are excluded
  TestValidator.predicate(
    "no reviews with rating outside 3-4 range",
    !rangeResult.data.some((r) => r.rating < 3 || r.rating > 4),
  );
  // ============================================================
  // TEST SCENARIO 4: Sort by rating descending
  // ============================================================
  const descResult = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId: product.id,
      body: {
        sort: "rating",
        order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(descResult);
  for (let i = 1; i < descResult.data.length; i++) {
    TestValidator.predicate(
      "reviews sorted by rating descending",
      descResult.data[i - 1].rating >= descResult.data[i].rating,
    );
  }
  // ============================================================
  // TEST SCENARIO 5: Sort by rating ascending
  // ============================================================
  const ascResult = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId: product.id,
      body: {
        sort: "rating",
        order: "asc",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(ascResult);
  for (let i = 1; i < ascResult.data.length; i++) {
    TestValidator.predicate(
      "reviews sorted by rating ascending",
      ascResult.data[i - 1].rating <= ascResult.data[i].rating,
    );
  }
  // ============================================================
  // TEST SCENARIO 6: Combined filter with search
  // ============================================================
  const searchTerm = RandomGenerator.substring(createdReviews[0].content ?? "");
  const combinedResult =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        rating_min: 4,
        rating_max: 5,
        search: searchTerm,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(combinedResult);
  // Verify all results match rating criteria
  TestValidator.predicate(
    "combined filter - rating range",
    combinedResult.data.every((r) => r.rating >= 4 && r.rating <= 5),
  );
}
