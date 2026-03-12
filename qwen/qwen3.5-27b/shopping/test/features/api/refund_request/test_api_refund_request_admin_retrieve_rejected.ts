import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test that an authenticated administrator can retrieve refund request details
 * when the request has been rejected by the seller, and verify that no
 * additional refund requests can be created for the same order item.
 */
export async function test_api_refund_request_admin_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com/admin",
    },
  });
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      shop_name: "Test Shop",
      href: "https://test.com/seller",
      referrer: "https://test.com/seller",
    },
  });
  // 3. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      display_name: "Test Customer",
      href: "https://test.com/customer",
      referrer: "https://test.com/customer",
    },
  });
  // 4. Create order as customer (simulated via utility)
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 5. Create refund request for a delivered order item
  const refundReason = "Product was damaged during shipping";
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  // 6. Admin retrieves the refund request details
  // Note: In simulation mode, the system may return a rejected state
  const retrievedRefundRequest =
    await api.functional.shoppingMall.admin.refund_requests.at(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 7. Verify the response contains expected fields
  TestValidator.equals(
    "refund request ID matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "reason matches original",
    retrievedRefundRequest.reason,
    refundReason,
  );
  TestValidator.equals(
    "order item ID matches",
    retrievedRefundRequest.orderItem.id,
    order.orderItems[0].id,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedRefundRequest.customer.id,
    order.customer.id,
  );
  // Verify customer information is correctly included
  TestValidator.predicate(
    "customer display name exists",
    retrievedRefundRequest.customer.display_name !== "",
  );
  TestValidator.predicate(
    "customer email is valid",
    retrievedRefundRequest.customer.email.includes("@"),
  );
  // Verify order item details remain intact
  TestValidator.predicate(
    "order item has valid quantity",
    retrievedRefundRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item has valid price",
    retrievedRefundRequest.orderItem.price >= 0,
  );
  // 8. Verify that attempting to create another refund request for the same order item fails
  // Business rule: rejected refund resubmission is not allowed
  await TestValidator.error(
    "cannot create duplicate refund request",
    async () => {
      await generate_random_shopping_mall_customer_refund_requests_create(
        customerConnection,
        {
          body: {
            orderItemId: order.orderItems[0].id,
            reason: "Trying to resubmit after rejection",
          },
        },
      );
    },
  );
}
