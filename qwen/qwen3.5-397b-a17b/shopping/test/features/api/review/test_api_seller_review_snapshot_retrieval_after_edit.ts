import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
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
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
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

export async function test_api_seller_review_snapshot_retrieval_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: "CustomerPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 4. Customer creates order (simplified - assumes cart is pre-populated)
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerLoginConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item for review
  const orderItem = order.items[0];
  TestValidator.predicate("order has items", order.items.length > 0);
  // 5. Seller creates shipment for the order item
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerLoginConnection,
    {
      body: {
        order_item_ids: [orderItem.id],
        tracking_carrier: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 6. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerLoginConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 7. Customer creates initial review (rating 5, content "Great product")
  const initialReview =
    await api.functional.shoppingMall.customer.customers.order_items.review.create(
      customerLoginConnection,
      {
        orderItemId: orderItem.id,
        body: {
          rating: 5,
          content: "Great product",
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(initialReview);
  TestValidator.equals("initial rating", initialReview.rating, 5);
  TestValidator.equals(
    "initial content",
    initialReview.content,
    "Great product",
  );
  // 8. Customer updates review first time (rating 4, content "Good product with minor issues")
  const firstUpdate = await api.functional.shoppingMall.customer.reviews.update(
    customerLoginConnection,
    {
      reviewId: initialReview.id,
      body: {
        rating: 4,
        content: "Good product with minor issues",
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  TestValidator.equals("first update rating", firstUpdate.rating, 4);
  TestValidator.equals(
    "first update content",
    firstUpdate.content,
    "Good product with minor issues",
  );
  // 9. Customer updates review second time (rating 3, content "Average product")
  const secondUpdate =
    await api.functional.shoppingMall.customer.reviews.update(
      customerLoginConnection,
      {
        reviewId: initialReview.id,
        body: {
          rating: 3,
          content: "Average product",
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals("second update rating", secondUpdate.rating, 3);
  TestValidator.equals(
    "second update content",
    secondUpdate.content,
    "Average product",
  );
  // 10. Seller retrieves review snapshots
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.reviews.snapshots.index(
      sellerLoginConnection,
      {
        reviewId: initialReview.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 11. Validate snapshots
  TestValidator.equals("snapshot count", snapshotsResponse.data.length, 2);
  TestValidator.equals(
    "pagination total records",
    snapshotsResponse.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination pages",
    snapshotsResponse.pagination.pages,
    1,
  );
  // First snapshot (most recent edit - rating 4)
  const firstSnapshot = snapshotsResponse.data[0];
  TestValidator.equals("first snapshot rating", firstSnapshot.rating, 4);
  TestValidator.equals(
    "first snapshot content",
    firstSnapshot.content,
    "Good product with minor issues",
  );
  TestValidator.equals(
    "first snapshot user id",
    firstSnapshot.snapshotByUser.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "first snapshot user nickname",
    firstSnapshot.snapshotByUser.nickname,
    customerAuth.nickname,
  );
  // Second snapshot (original review - rating 5)
  const secondSnapshot = snapshotsResponse.data[1];
  TestValidator.equals("second snapshot rating", secondSnapshot.rating, 5);
  TestValidator.equals(
    "second snapshot content",
    secondSnapshot.content,
    "Great product",
  );
  TestValidator.equals(
    "second snapshot user id",
    secondSnapshot.snapshotByUser.id,
    customerAuth.id,
  );
  // Validate timestamps are in descending order
  const firstTimestamp = new Date(firstSnapshot.snapshot_at).getTime();
  const secondTimestamp = new Date(secondSnapshot.snapshot_at).getTime();
  TestValidator.predicate(
    "snapshots sorted by snapshot_at descending",
    firstTimestamp > secondTimestamp,
  );
  // Validate ISO 8601 format
  TestValidator.predicate(
    "first snapshot timestamp is ISO 8601",
    !isNaN(firstTimestamp),
  );
  TestValidator.predicate(
    "second snapshot timestamp is ISO 8601",
    !isNaN(secondTimestamp),
  );
}
