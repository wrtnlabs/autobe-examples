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
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller refund request list date range filtering functionality.
 *
 * This test validates that sellers can filter refund requests by date range
 * using the requested_at parameter. The test creates multiple refund requests
 * at different timestamps and verifies various date range filtering scenarios.
 *
 * Test flow:
 * 1. Setup: Create seller account and login
 * 2. Setup: Create customer account and login
 * 3. Setup: Seller creates product and variant
 * 4. Setup: Customer places multiple orders
 * 5. Setup: Seller ships orders, customer confirms delivery
 * 6. Setup: Customer submits multiple refund requests at different times
 * 7. Test: Filter refund requests with 'from' parameter
 * 8. Test: Filter refund requests with 'to' parameter
 * 9. Test: Filter refund requests with combined from/to parameters
 * 10. Test: Verify empty results for non-matching date ranges
 * 11. Test: Verify pagination metadata reflects filtered counts
 */
export async function test_api_seller_refund_request_list_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Setup customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: "TestPassword123!",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer places multiple orders (simulated with different timestamps)
  const orders: IShoppingMallOrder[] = [];
  for (let i = 0; i < 3; i++) {
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_address_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
    typia.assert(order);
    orders.push(order);
  }
  // 6. Seller ships order items
  const shipments: IShoppingMallShipment[] = [];
  for (const order of orders) {
    const orderItemIds = order.orderItems.map((item) => item.id);
    if (orderItemIds.length > 0) {
      const shipment =
        await generate_random_shopping_mall_seller_shipments_create(
          sellerLoginConnection,
          {
            body: {
              tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL"]),
              tracking_number: `TRACK-${RandomGenerator.alphaNumeric(12)}`,
              order_item_ids: orderItemIds,
            } satisfies IShoppingMallShipment.ICreate,
          },
        );
      typia.assert(shipment);
      shipments.push(shipment);
    }
  }
  // 7. Customer confirms delivery for all shipments
  for (const shipment of shipments) {
    const confirmedShipment =
      await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
        customerLoginConnection,
        {
          shipmentId: shipment.id,
        },
      );
    typia.assert(confirmedShipment);
  }
  // 8. Customer creates multiple refund requests at different times
  const refundRequests: IShoppingMallRefundRequest[] = [];
  for (const order of orders) {
    for (const orderItem of order.orderItems) {
      const refundRequest =
        await generate_random_shopping_mall_customer_order_items_refund_requests_create(
          customerLoginConnection,
          {
            params: { orderItemId: orderItem.id },
            body: {
              reason: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies IShoppingMallRefundRequest.ICreate,
          },
        );
      typia.assert(refundRequest);
      refundRequests.push(refundRequest);
    }
  }
  // Validate we have refund requests to test with
  TestValidator.predicate("refund requests created", refundRequests.length > 0);
  // Sort refund requests by requested_at for testing
  const sortedRequests = refundRequests.sort(
    (a, b) =>
      new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime(),
  );
  // 9. Test: Filter with 'from' parameter (requests on or after specific date)
  const fromDate =
    sortedRequests[1]?.requested_at ?? sortedRequests[0].requested_at;
  const fromResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerLoginConnection,
      {
        body: {
          requested_at: {
            from: fromDate,
          },
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(fromResult);
  TestValidator.predicate(
    "from filter returns requests on or after date",
    fromResult.data.every(
      (req) =>
        new Date(req.requested_at).getTime() >= new Date(fromDate).getTime(),
    ),
  );
  // 10. Test: Filter with 'to' parameter (requests on or before specific date)
  const toDate =
    sortedRequests[1]?.requested_at ?? sortedRequests[0].requested_at;
  const toResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerLoginConnection,
      {
        body: {
          requested_at: {
            to: toDate,
          },
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(toResult);
  TestValidator.predicate(
    "to filter returns requests on or before date",
    toResult.data.every(
      (req) =>
        new Date(req.requested_at).getTime() <= new Date(toDate).getTime(),
    ),
  );
  // 11. Test: Filter with combined from/to parameters
  const combinedFromDate = sortedRequests[0].requested_at;
  const combinedToDate = sortedRequests[sortedRequests.length - 1].requested_at;
  const combinedResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerLoginConnection,
      {
        body: {
          requested_at: {
            from: combinedFromDate,
            to: combinedToDate,
          },
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter returns requests within date range",
    combinedResult.data.every(
      (req) =>
        new Date(req.requested_at).getTime() >=
          new Date(combinedFromDate).getTime() &&
        new Date(req.requested_at).getTime() <=
          new Date(combinedToDate).getTime(),
    ),
  );
  // 12. Test: Empty results for non-matching date range
  const futureDate = new Date(
    new Date(combinedToDate).getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const emptyResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerLoginConnection,
      {
        body: {
          requested_at: {
            from: futureDate,
          },
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result for future date",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination records",
    emptyResult.pagination.records,
    0,
  );
  // 13. Test: Pagination metadata reflects filtered counts
  TestValidator.equals(
    "from filter pagination records",
    fromResult.pagination.records,
    fromResult.data.length,
  );
  TestValidator.equals(
    "to filter pagination records",
    toResult.pagination.records,
    toResult.data.length,
  );
  TestValidator.equals(
    "combined filter pagination records",
    combinedResult.pagination.records,
    combinedResult.data.length,
  );
}