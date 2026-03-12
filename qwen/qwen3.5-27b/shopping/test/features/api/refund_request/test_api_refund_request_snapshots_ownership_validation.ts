import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundSnapshot";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test that a customer cannot access refund request snapshots belonging to another customer's refund request.
 * This validates the data isolation and ownership verification for refund request snapshots.
 * 1. Two different customer accounts are created and authenticated separately
 * 2. First customer creates an order and refund request
 * 3. Seller responds to create snapshots for the first customer's refund request
 * 4. Second customer attempts to access snapshots using the first customer's refund request ID
 * 5. The system returns a 403 Forbidden error indicating the customer does not have ownership
 * 6. No snapshot data is exposed to the unauthorized customer
 */
export async function test_api_refund_request_snapshots_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first customer
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer1);
  // 2. Create and authenticate second customer
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer2);
  // 3. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 4. First customer creates an order
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customer1Connection,
      {},
    );
  typia.assert(order);
  // 5. First customer creates a refund request for their order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customer1Connection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 6. Seller approves the refund request (creates snapshots)
  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedRefundRequest);
  // 7. Second customer attempts to access snapshots of first customer's refund request
  await TestValidator.error(
    "customer2 cannot access customer1's refund request snapshots",
    async () => {
      await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
        customer2Connection,
        {
          refundRequestId: refundRequest.id,
          body: {} satisfies IShoppingMallRefundSnapshot.IRequest,
        },
      );
    },
  );
  // 8. Verify that customer1 can still access their own refund request snapshots
  const snapshots =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customer1Connection,
      {
        refundRequestId: refundRequest.id,
        body: {} satisfies IShoppingMallRefundSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 9. Validate that snapshots exist for the authorized customer
  TestValidator.predicate(
    "customer1 can access their own refund request snapshots",
    snapshots.data.length > 0,
  );
}
