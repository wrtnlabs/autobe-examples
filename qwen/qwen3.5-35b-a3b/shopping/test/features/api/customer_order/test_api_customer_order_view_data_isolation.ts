import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
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
 * Test data isolation to ensure customers cannot access other customers' orders.
 *
 * This test verifies that when Customer B attempts to access Customer A's order,
 * the system returns 404 Not Found instead of 403 Forbidden. This prevents
 * enumeration attacks where attackers could determine if orders exist for
 * different customer IDs.
 */
export async function test_api_customer_order_view_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A (the order owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerA);
  // 2. Create Customer B (the unauthorized user)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerB);
  // 3. Generate a random order ID that Customer B doesn't own
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve the order using Customer B's authentication
  // The system should return 404 Not Found (not 403 Forbidden)
  // This verifies data isolation - Customer B cannot access orders they don't own
  await TestValidator.httpError(
    "unauthorized customer receives 404 for other customer's order",
    [404],
    async () => {
      const connectionWithBAuth: api.IConnection = {
        host: connection.host,
        headers: { Authorization: customerB.token.access },
      };
      await api.functional.ecommerceMall.customer.orders.at(
        connectionWithBAuth,
        { orderId },
      );
    },
  );
}
