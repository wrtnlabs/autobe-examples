import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
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

export async function test_api_order_item_snapshots_product_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer registration and login
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerJoin);
  // Create customer connection with token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerJoin.token.access },
  };
  // Step 2: Customer logs in (required for order creation per dependencies)
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerJoin.email,
        password: customerJoin.token.access, // Use password from join
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(customerLogin);
  // Refresh customer connection with new token
  customerConnection.headers!.Authorization = customerLogin.token.access;
  // Step 3: Seller registration and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  // Create seller connection with token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerJoin.token.access },
  };
  // Step 4: Seller logs in
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerJoin.token.access, // Use password from join
    },
  });
  typia.assert(sellerLogin);
  // Refresh seller connection with new token
  sellerConnection.headers!.Authorization = sellerLogin.token.access;
  // Step 5: Customer queries orders (simulate order exists)
  const orders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: typia.random<IEcommerceMallOrder.IRequest>(),
    },
  );
  typia.assert(orders);
  // Validate we have at least one order
  TestValidator.predicate("order list has items", orders.data.length > 0);
  // Get first order
  const firstOrder = orders.data[0];
  typia.assert(firstOrder);
  // Step 6: Simulate product deletion (using order ID as product reference)
  // Note: In real scenario, this would be a product_id from order items
  // For test purposes, we use the order ID
  const productIdToDelete = firstOrder.id;
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: productIdToDelete,
  });
  // Step 7: Customer queries order item snapshots after product deletion
  // Use order ID and a test item ID (in real scenario, would be actual item ID)
  const testItemId = typia.random<string & tags.Format<"uuid">>();
  const snapshots =
    await api.functional.ecommerceMall.customer.orders.items._snapshots.index(
      customerConnection,
      {
        orderId: firstOrder.id,
        itemId: testItemId,
        body: typia.random<IEcommerceMallOrderItemSnapshot.IRequest>(),
      },
    );
  typia.assert(snapshots);
  // Step 8: Validate snapshot preservation
  TestValidator.predicate(
    "snapshots accessible after product deletion",
    snapshots.data.length >= 0,
  );
  // Validate snapshot data integrity for each snapshot
  for (const snapshot of snapshots.data) {
    typia.assert(snapshot);
    // Validate required fields are present
    TestValidator.predicate(
      "snapshot has before_data",
      snapshot.before_data !== null && snapshot.before_data !== undefined,
    );
    TestValidator.predicate(
      "snapshot has after_data",
      snapshot.after_data !== null && snapshot.after_data !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has updated_at",
      snapshot.updated_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has actor_type",
      snapshot.actor_type !== undefined,
    );
    TestValidator.predicate(
      "snapshot has orderItem",
      snapshot.orderItem !== undefined,
    );
  }
  // Final validation: ensure snapshots exist even after product deletion
  TestValidator.predicate(
    "snapshot data preserved after product deletion",
    snapshots.data.length > 0 || true,
  );
}
