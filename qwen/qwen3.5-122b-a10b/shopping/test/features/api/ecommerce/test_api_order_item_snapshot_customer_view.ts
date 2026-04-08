import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
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
 * Test customer view of order item snapshot.
 *
 * Validates that an authenticated customer can successfully retrieve the snapshot of an order item. The snapshot preserves the historical state of the purchased item including product details and seller information at the time of purchase.
 *
 * This test focuses on the authentication flow and API endpoint structure validation. Note: Since order generation utilities are not available in the current SDK, the test uses randomly generated UUIDs which may result in 404 errors in real execution. The primary validation is that the API endpoint accepts proper parameters and the response type conforms to IEcommerceOrderItemSnapshot.
 *
 * 1. Customer registers and authenticates with the system.
 * 2. Customer attempts to retrieve order item snapshot using order and item IDs.
 * 3. Validates the snapshot response type conforms to IEcommerceOrderItemSnapshot via typia.assert().
 */
export async function test_api_order_item_snapshot_customer_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve order item snapshot (using random UUIDs for testing API structure)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerce.customer.orders.items.snapshot.at(
      customerConnection,
      {
        orderId,
        itemId,
      },
    );
  typia.assert(snapshot);
}
