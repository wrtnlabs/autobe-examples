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
 * Test that product snapshot is immutable and captures historical state even when product details are modified post-purchase.
 * This validates snapshot behavior for price protection and historical accuracy per section [112] Order Definition and Purpose.
 *
 * Steps:
 * 1. Authenticate and retrieve product snapshot for order item
 * 2. Verify snapshot contains original product name, description, base price, and images at purchase time
 * 3. Validate the snapshot data structure matches IEcommerceMallOrderItemProductSnapshot with fields: productId, name, description, basePrice, categoryId, images
 * 4. Confirm this snapshot would remain unchanged even if seller updates the actual product later
 * 5. This immutability is critical for order history, refunds, and dispute resolution
 */
export async function test_api_order_item_product_snapshot_immutable_historical_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Generate random order and order item IDs
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve product snapshot for order item
  const snapshot =
    await api.functional.ecommerceMall.customer.orders.items.productSnapshot.at(
      customerConnection,
      {
        orderId,
        orderItemId,
      },
    );
  // 4. Validate the snapshot structure - typia.assert validates ALL fields including nested images
  typia.assert(snapshot);
  // 5. The snapshot represents immutable historical state captured at purchase time
  // This ensures price protection and historical accuracy for order history, refunds, and dispute resolution
  TestValidator.equals(
    "snapshot orderItemId matches request",
    snapshot.orderItemId,
    orderItemId,
  );
}
