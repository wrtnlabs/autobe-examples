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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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

export async function test_api_product_review_list_with_multiple_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and login admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Seller setup - create and login seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 3. Admin approves seller registration
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerJoin.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "APPROVED",
  );
  // 4. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
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
  // 5. Customer setup - create and login customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 6. Customer places first order
  const firstOrder = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(firstOrder);
  TestValidator.predicate("first order has items", firstOrder.items.length > 0);
  const firstOrderItemId = firstOrder.items[0].id;
  // 7. Customer places second order (needed for second review)
  const secondOrder = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(secondOrder);
  TestValidator.predicate(
    "second order has items",
    secondOrder.items.length > 0,
  );
  const secondOrderItemId = secondOrder.items[0].id;
  // 8. Seller creates shipment for first order
  const firstShipment =
    await api.functional.shoppingMall.seller.shipments.create(
      sellerConnection,
      {
        body: {
          order_item_ids: firstOrder.items.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(firstShipment);
  // 9. Seller creates shipment for second order
  const secondShipment =
    await api.functional.shoppingMall.seller.shipments.create(
      sellerConnection,
      {
        body: {
          order_item_ids: secondOrder.items.map((item) => item.id),
          tracking_carrier: "UPS",
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(secondShipment);
  // 10. Customer confirms delivery on first shipment
  const firstDeliveryConfirmed =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: firstShipment.id,
      },
    );
  typia.assert(firstDeliveryConfirmed);
  TestValidator.predicate(
    "first shipment delivery confirmed",
    firstDeliveryConfirmed.delivery_confirmed_at !== null,
  );
  // 11. Customer confirms delivery on second shipment
  const secondDeliveryConfirmed =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: secondShipment.id,
      },
    );
  typia.assert(secondDeliveryConfirmed);
  TestValidator.predicate(
    "second shipment delivery confirmed",
    secondDeliveryConfirmed.delivery_confirmed_at !== null,
  );
  // 12. Customer creates first review for first order item
  const firstReview =
    await api.functional.shoppingMall.customer.customers.order_items.review.create(
      customerConnection,
      {
        orderItemId: firstOrderItemId,
        body: {
          rating: 5,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(firstReview);
  TestValidator.equals("first review rating", firstReview.rating, 5);
  // 13. Customer creates second review for second order item
  const secondReview =
    await api.functional.shoppingMall.customer.customers.order_items.review.create(
      customerConnection,
      {
        orderItemId: secondOrderItemId,
        body: {
          rating: 4,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallReview.ICreate,
      },
    );
  typia.assert(secondReview);
  TestValidator.equals("second review rating", secondReview.rating, 4);
  // 14. Retrieve product reviews list
  const reviewList = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at,desc",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(reviewList);
  // 15. Validate review list response
  TestValidator.equals("total review count", reviewList.pagination.records, 2);
  TestValidator.equals("current page", reviewList.pagination.current, 1);
  TestValidator.equals("total pages", reviewList.pagination.pages, 1);
  TestValidator.predicate("has two reviews", reviewList.data.length === 2);
  // 16. Verify reviews are sorted by created_at DESC (newest first)
  TestValidator.equals(
    "first review is secondReview (newest)",
    reviewList.data[0].id,
    secondReview.id,
  );
  TestValidator.equals(
    "second review is firstReview (older)",
    reviewList.data[1].id,
    firstReview.id,
  );
  // 17. Validate review structure
  const firstListedReview = reviewList.data[0];
  TestValidator.predicate(
    "review has valid rating",
    firstListedReview.rating >= 1 && firstListedReview.rating <= 5,
  );
  TestValidator.predicate(
    "review has customer info",
    firstListedReview.customer !== undefined,
  );
  TestValidator.predicate(
    "review has created_at",
    firstListedReview.created_at !== undefined,
  );
  TestValidator.equals(
    "customer nickname matches",
    firstListedReview.customer.nickname,
    customerJoin.nickname,
  );
}
