import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test refund snapshot access for dispute resolution with proper authorization.
 *
 * This test verifies that refund snapshots are accessible to authorized parties
 * (customers, sellers, admins) for dispute resolution scenarios while properly
 * restricting cross-ownership access.
 */
export async function test_api_refund_snapshot_dispute_resolution_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate customer, seller, and admin
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Customer creates order
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 3. Customer creates refund request for delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: "Product arrived damaged",
        },
      },
    );
  typia.assert(refundRequest);
  // 4. Generate a valid snapshot ID for testing (simulating an existing snapshot)
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Test: Customer can view their own refund snapshot
  const customerSnapshot =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.at(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(customerSnapshot);
  TestValidator.equals(
    "customer snapshot refundRequestId matches",
    customerSnapshot.refundRequest.id,
    refundRequest.id,
  );
  TestValidator.predicate(
    "customer snapshot contains snapshot_data",
    customerSnapshot.snapshot_data.length > 0,
  );
  // 6. Test: Seller can view their own refund snapshot
  const sellerSnapshot =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(sellerSnapshot);
  TestValidator.equals(
    "seller snapshot refundRequestId matches",
    sellerSnapshot.refundRequest.id,
    refundRequest.id,
  );
  TestValidator.predicate(
    "seller snapshot contains snapshot_data",
    sellerSnapshot.snapshot_data.length > 0,
  );
  // 7. Test: Admin can view any refund snapshot
  const adminSnapshot =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(adminSnapshot);
  TestValidator.equals(
    "admin snapshot refundRequestId matches",
    adminSnapshot.refundRequest.id,
    refundRequest.id,
  );
  TestValidator.predicate(
    "admin snapshot contains snapshot_data",
    adminSnapshot.snapshot_data.length > 0,
  );
  // 8. Test: Cross-authorization - Create second customer and verify access restriction
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(otherCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  await TestValidator.httpError(
    "other customer cannot access refund snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.snapshots.at(
        otherCustomerConnection,
        {
          refundRequestId: refundRequest.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
  // 9. Test: Cross-authorization - Create second seller and verify access restriction
  const otherSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  await TestValidator.httpError(
    "other seller cannot access refund snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.snapshots.at(
        otherSellerConnection,
        {
          refundRequestId: refundRequest.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
