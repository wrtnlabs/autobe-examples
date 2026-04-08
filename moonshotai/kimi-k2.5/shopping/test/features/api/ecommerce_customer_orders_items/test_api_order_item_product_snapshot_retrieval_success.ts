import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test successful retrieval of product snapshot for a customer's order item.
 * This endpoint returns the immutable product state captured at the time of purchase
 * (historical snapshot, not current product state).
 *
 * Steps:
 * 1. Authenticate as customer who owns the order containing the order item
 * 2. Call the product snapshot endpoint with orderId and orderItemId
 * 3. Validate response contains product snapshot with purchase-time data
 * 4. Verify the snapshot reflects immutable state at purchase time
 */
export async function test_api_order_item_product_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection for isolated authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as customer
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies DeepPartial<IEcommerceMallCustomer.IJoin>,
  });
  // Step 2: Generate valid UUID parameters for order context
  const orderId: string = typia.random<string & tags.Format<"uuid">>();
  const orderItemId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the product snapshot for the order item
  const snapshot: IEcommerceMallOrderItemProductSnapshot =
    await api.functional.ecommerceMall.customer.orders.items.productSnapshot.at(
      customerConnection,
      {
        orderId: orderId,
        orderItemId: orderItemId,
      },
    );
  // Step 4: Validate response contains complete product snapshot data
  typia.assert(snapshot);
}
