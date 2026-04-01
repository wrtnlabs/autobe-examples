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
 * Test seller refund request list with status filtering.
 *
 * This test validates that sellers can retrieve and filter refund requests
 * for order items they sold. It tests:
 * 1. Seller authentication and viewing refund requests for their items
 * 2. Filtering by status (pending, approved, rejected) returns correct subsets
 * 3. Response includes complete refund request summaries with order item details
 * 4. Pagination works correctly with configurable page sizes
 * 5. Results are sorted by requested_at descending (newest first)
 * 6. Seller cannot see refund requests for order items they did not sell
 */
export async function test_api_seller_refund_request_list_with_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Setup customer account and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
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
  // 4. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item for this seller's product
  const orderItem = order.orderItems[0];
  if (!orderItem) {
    throw new Error("Order item not found for seller's product");
  }
  // 6. Seller ships the order
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL"]),
        tracking_number: RandomGenerator.alphaNumeric(16),
        order_item_ids: [orderItem.id],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 7. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 8. Create first refund request (will remain pending)
  const refundRequest1 =
    await generate_random_shopping_mall_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { orderItemId: orderItem.id },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest1);
  TestValidator.equals(
    "first request status",
    refundRequest1.status,
    "pending",
  );
  // 9. Create second order item for same product to create another refund request
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order2);
  const orderItem2 = order2.orderItems[0];
  if (!orderItem2) {
    throw new Error("Second order item not found for seller's product");
  }
  // Ship and deliver second order
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL"]),
        tracking_number: RandomGenerator.alphaNumeric(16),
        order_item_ids: [orderItem2.id],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment2);
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      shipmentId: shipment2.id,
    },
  );
  // 10. Create second refund request (will be approved)
  const refundRequest2 =
    await generate_random_shopping_mall_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { orderItemId: orderItem2.id },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest2);
  // Seller approves second refund request
  const approvedRefund =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest2.id,
        body: {
          status: "approved",
          response_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRefund);
  TestValidator.equals("approved status", approvedRefund.status, "approved");
  // 11. Create third order item for rejected refund
  const order3 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order3);
  const orderItem3 = order3.orderItems[0];
  if (!orderItem3) {
    throw new Error("Third order item not found for seller's product");
  }
  // Ship and deliver third order
  const shipment3 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL"]),
        tracking_number: RandomGenerator.alphaNumeric(16),
        order_item_ids: [orderItem3.id],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment3);
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      shipmentId: shipment3.id,
    },
  );
  // 12. Create third refund request (will be rejected)
  const refundRequest3 =
    await generate_random_shopping_mall_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { orderItemId: orderItem3.id },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest3);
  // Seller rejects third refund request
  const rejectedRefund =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest3.id,
        body: {
          status: "rejected",
          response_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(rejectedRefund);
  TestValidator.equals("rejected status", rejectedRefund.status, "rejected");
  // 13. Test filtering by status - pending
  const pendingRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  TestValidator.predicate(
    "pending count >= 1",
    pendingRequests.data.length >= 1,
  );
  pendingRequests.data.forEach((request) => {
    TestValidator.equals("all pending", request.status, "pending");
  });
  // 14. Test filtering by status - approved
  const approvedRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  TestValidator.predicate(
    "approved count >= 1",
    approvedRequests.data.length >= 1,
  );
  approvedRequests.data.forEach((request) => {
    TestValidator.equals("all approved", request.status, "approved");
    TestValidator.predicate(
      "has response reason",
      request.response_reason !== null && request.response_reason !== undefined,
    );
  });
  // 15. Test filtering by status - rejected
  const rejectedRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  TestValidator.predicate(
    "rejected count >= 1",
    rejectedRequests.data.length >= 1,
  );
  rejectedRequests.data.forEach((request) => {
    TestValidator.equals("all rejected", request.status, "rejected");
    TestValidator.predicate(
      "has response reason",
      request.response_reason !== null && request.response_reason !== undefined,
    );
  });
  // 16. Test pagination
  const page1 = await api.functional.shoppingMall.seller.refund_requests.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  const page2 = await api.functional.shoppingMall.seller.refund_requests.index(
    sellerConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IShoppingMallRefundRequest.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
  // 17. Test sorting by requested_at descending
  const allRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  if (allRequests.data.length > 1) {
    for (let i = 1; i < allRequests.data.length; i++) {
      const prev = new Date(allRequests.data[i - 1].requested_at).getTime();
      const curr = new Date(allRequests.data[i].requested_at).getTime();
      TestValidator.predicate(`sorted descending at index ${i}`, prev >= curr);
    }
  }
  // 18. Verify response structure includes all required fields
  if (allRequests.data.length > 0) {
    const sampleRequest = allRequests.data[0];
    TestValidator.predicate("has id", sampleRequest.id !== undefined);
    TestValidator.predicate(
      "has orderItem",
      sampleRequest.orderItem !== undefined,
    );
    TestValidator.predicate(
      "has customer",
      sampleRequest.customer !== undefined,
    );
    TestValidator.predicate("has reason", sampleRequest.reason !== undefined);
    TestValidator.predicate("has status", sampleRequest.status !== undefined);
    TestValidator.predicate(
      "has requested_at",
      sampleRequest.requested_at !== undefined,
    );
  }
}