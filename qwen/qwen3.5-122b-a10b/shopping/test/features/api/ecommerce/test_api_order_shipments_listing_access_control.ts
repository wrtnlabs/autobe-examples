import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer access control for order shipments listing.
 *
 * Validates that customers cannot access shipment information for orders belonging to other customers. This test ensures row-level security enforcement prevents unauthorized cross-customer data access.
 *
 * The test registers two customers and verifies that attempting to list shipments for an order not owned by the authenticated customer results in a 403 Forbidden error.
 *
 * 1. Register and authenticate Customer A.
 * 2. Register and authenticate Customer B.
 * 3. Customer B attempts to list shipments for a random order ID (not belonging to Customer B).
 * 4. Validates that the system returns 403 Forbidden error.
 */
export async function test_api_order_shipments_listing_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Register and authenticate Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Customer B attempts to list shipments for a random order ID
  // This simulates cross-customer access attempt
  const randomOrderId = typia.random<string & tags.Format<"uuid">>();
  // 4. Validate 403 Forbidden error
  await TestValidator.httpError(
    "customer cannot access other customer's order shipments",
    403,
    async () => {
      await api.functional.ecommerce.customer.orders.shipments.index(
        customerBConnection,
        {
          orderId: randomOrderId,
          body: {} satisfies IEcommerceShipment.IRequest,
        },
      );
    },
  );
}
