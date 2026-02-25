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

export async function test_api_product_reviews_list_by_newest(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // Setup seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: { shop_name: RandomGenerator.name() },
  });
  // Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // Create product (note: category_id is required by the API)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          price: product.base_price,
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"] as const),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L"] as const),
            },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // Create multiple customers and orders to generate reviews
  const REVIEW_COUNT = 25;
  const reviewCreatedTimes: string[] = [];
  await ArrayUtil.asyncRepeat(REVIEW_COUNT, async () => {
    // Create customer
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {});
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
    // Create order
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {},
    );
    typia.assert(order);
    // Seller ships the order
    const shipment =
      await generate_random_shopping_mall_seller_sellers_me_shipments_create(
        sellerConnection,
        {
          body: {
            orderItemIds: order.orderItems.map((item) => item.id),
            carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL"] as const),
            trackingNumber: RandomGenerator.alphaNumeric(12),
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
    // Customer writes review
    const review =
      await generate_random_shopping_mall_customer_customers_me_reviews_create(
        customerConnection,
        {
          body: {
            product_id: product.id,
            order_id: order.id,
            rating: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(review);
    reviewCreatedTimes.push(review.created_at);
  });
  // Test: Get reviews sorted by newest (default)
  const reviewsResponse =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        sort: "created_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(reviewsResponse);
  // Verify pagination structure
  TestValidator.equals("current page", reviewsResponse.pagination.current, 1);
  TestValidator.equals("limit", reviewsResponse.pagination.limit, 10);
  TestValidator.predicate(
    "total records",
    reviewsResponse.pagination.records >= REVIEW_COUNT,
  );
  TestValidator.predicate("total pages", reviewsResponse.pagination.pages >= 3);
  // Verify data array has 10 items
  TestValidator.equals("data count on page 1", reviewsResponse.data.length, 10);
  // Verify reviews are sorted by created_at DESC (newest first)
  for (let i = 0; i < reviewsResponse.data.length - 1; i++) {
    const currentCreatedAt = new Date(
      reviewsResponse.data[i].created_at,
    ).getTime();
    const nextCreatedAt = new Date(
      reviewsResponse.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate(
      `review ${i} is newer than or equal to review ${i + 1}`,
      currentCreatedAt >= nextCreatedAt,
    );
  }
  // Test: Pagination - get page 2
  const page2Response =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        sort: "created_at",
        order: "desc",
        page: 2,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(page2Response);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.predicate("page 2 has data", page2Response.data.length > 0);
  // Verify page 2 has different reviews than page 1
  const page1Ids = new Set(reviewsResponse.data.map((r) => r.id));
  const page2Ids = new Set(page2Response.data.map((r) => r.id));
  const hasOverlap = [...page2Ids].some((id) => page1Ids.has(id));
  TestValidator.predicate("pages have different reviews", !hasOverlap);
  // Verify each review has correct structure
  reviewsResponse.data.forEach((review, index) => {
    TestValidator.predicate(
      `review ${index} has valid rating`,
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.equals(
      `review ${index} product matches`,
      review.product.id,
      product.id,
    );
    TestValidator.equals(
      `review ${index} is verified purchase`,
      review.verified,
      true,
    );
  });
}
