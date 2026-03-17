import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_customers_order_items_review_create } from "../../../generate/generate_random_shopping_mall_customer_customers_order_items_review_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that deleted reviews are properly excluded from the review list.
 *
 * This test validates the business rule that soft-deleted reviews are hidden
 * from the product review list while preserving the audit trail through snapshots.
 *
 * Test flow:
 * 1. Seller creates a product
 * 2. Customer places an order for the product
 * 3. Seller ships the order
 * 4. Customer confirms delivery
 * 5. Customer creates multiple reviews for the product (via different order items)
 * 6. Customer deletes one of the reviews
 * 7. Fetch the product review list
 * 8. Validate that deleted review is excluded from the list
 * 9. Validate pagination metadata reflects only non-deleted reviews
 */
export async function test_api_product_review_list_excludes_deleted_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product for review testing
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Customer setup - create customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Customer places first order for the product
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item for review creation
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 5. Seller creates shipment to ship order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: [orderItem.id],
        tracking_carrier: "TestCarrier",
        tracking_number: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 6. Customer confirms delivery to enable review creation
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 7. Customer creates first review for the delivered order item
  const review1 =
    await generate_random_shopping_mall_customer_customers_order_items_review_create(
      customerConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallReview.ICreate,
        params: {
          orderItemId: orderItem.id,
        },
      },
    );
  typia.assert(review1);
  // 8. Create a second order to get another order item for the same product
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order2);
  const orderItem2 = order2.items[0];
  typia.assert(orderItem2);
  // 9. Ship second order
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: [orderItem2.id],
        tracking_carrier: "TestCarrier2",
        tracking_number: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment2);
  // 10. Confirm delivery for second order
  const confirmedShipment2 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment2.id,
      },
    );
  typia.assert(confirmedShipment2);
  // 11. Create second review for the same product
  const review2 =
    await generate_random_shopping_mall_customer_customers_order_items_review_create(
      customerConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallReview.ICreate,
        params: {
          orderItemId: orderItem2.id,
        },
      },
    );
  typia.assert(review2);
  // 12. Customer deletes the first review (soft delete)
  await api.functional.shoppingMall.customer.reviews.erase(customerConnection, {
    reviewId: review1.id,
  });
  // 13. Fetch the product review list
  const reviewList = await api.functional.shoppingMall.products.reviews.index(
    customerConnection,
    {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(reviewList);
  // 14. Validate that deleted review is excluded from the list
  TestValidator.equals(
    "review count excludes deleted",
    reviewList.data.length,
    1,
  );
  TestValidator.equals(
    "pagination records count excludes deleted",
    reviewList.pagination.records,
    1,
  );
  // 15. Validate that the remaining review is review2 (not deleted)
  TestValidator.equals(
    "remaining review is review2",
    reviewList.data[0]?.id,
    review2.id,
  );
  // 16. Validate that review1 (deleted) is not in the list
  const deletedReviewFound = reviewList.data.some(
    (review) => review.id === review1.id,
  );
  TestValidator.predicate(
    "deleted review not in list",
    () => !deletedReviewFound,
  );
}
