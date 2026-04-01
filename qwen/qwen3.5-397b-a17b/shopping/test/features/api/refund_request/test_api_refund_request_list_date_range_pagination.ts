import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_list_date_range_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Set up customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphabets(10),
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer creates an order (backend should have default address for testing)
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item from the order
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  // 6. Seller updates order item status to delivered
  const updatedOrderItem =
    await api.functional.shoppingMall.seller.orders.items.update(
      sellerConnection,
      {
        itemId: orderItem.id,
        body: {
          status: "delivered",
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(updatedOrderItem);
  TestValidator.equals(
    "order item status is delivered",
    updatedOrderItem.status,
    "delivered",
  );
  // 7. Create three refund requests with different timestamps
  const refundRequest1 =
    await api.functional.shoppingMall.customer.order_items.refund_requests.create(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const refundRequest2 =
    await api.functional.shoppingMall.customer.order_items.refund_requests.create(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest2);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const refundRequest3 =
    await api.functional.shoppingMall.customer.order_items.refund_requests.create(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest3);
  // 8. Test date range filtering - get all refund requests first
  const allRequests =
    await api.functional.shoppingMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  TestValidator.equals(
    "total refund requests count",
    allRequests.data.length,
    3,
  );
  // 9. Test date range filtering with from timestamp
  const fromDate = refundRequest2.requested_at;
  const filteredByFromDate =
    await api.functional.shoppingMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 10,
          requested_at: {
            from: fromDate,
          },
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(filteredByFromDate);
  TestValidator.predicate(
    "filtered by from date returns 2 or fewer requests",
    filteredByFromDate.data.length <= 2,
  );
  // 10. Test date range filtering with to timestamp
  const toDate = refundRequest2.requested_at;
  const filteredByToDate =
    await api.functional.shoppingMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 10,
          requested_at: {
            to: toDate,
          },
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(filteredByToDate);
  TestValidator.predicate(
    "filtered by to date returns 2 or fewer requests",
    filteredByToDate.data.length <= 2,
  );
  // 11. Test pagination with limit 2
  const page1 =
    await api.functional.shoppingMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 has 2 items", page1.data.length, 2);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.equals("page 1 total records", page1.pagination.records, 3);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 2);
  // 12. Get page 2
  const page2 =
    await api.functional.shoppingMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 has 1 item", page2.data.length, 1);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
  // 13. Verify sorting is by requested_at descending (newest first)
  const page1Request1 = page1.data[0];
  const page1Request2 = page1.data[1];
  const page2Request1 = page2.data[0];
  TestValidator.predicate(
    "page 1 first request is newer than page 2 request",
    new Date(page1Request1.requested_at).getTime() >=
      new Date(page2Request1.requested_at).getTime(),
  );
  TestValidator.predicate(
    "page 1 second request is newer or equal to page 2 request",
    new Date(page1Request2.requested_at).getTime() >=
      new Date(page2Request1.requested_at).getTime(),
  );
  // 14. Test combined date range and pagination
  const combinedFilter =
    await api.functional.shoppingMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 2,
          requested_at: {
            from: refundRequest1.requested_at,
            to: refundRequest3.requested_at,
          },
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter returns requests within date range",
    combinedFilter.data.length >= 1 && combinedFilter.data.length <= 3,
  );
  for (const request of combinedFilter.data) {
    TestValidator.predicate(
      "request is within date range",
      new Date(request.requested_at).getTime() >=
        new Date(refundRequest1.requested_at).getTime() &&
        new Date(request.requested_at).getTime() <=
          new Date(refundRequest3.requested_at).getTime(),
    );
  }
}
