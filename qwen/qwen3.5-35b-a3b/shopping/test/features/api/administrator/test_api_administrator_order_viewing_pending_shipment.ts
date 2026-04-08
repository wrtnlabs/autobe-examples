import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_order_viewing_pending_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Admin login to get token
  const adminAuthConnection: api.IConnection = { host: connection.host };
  const adminAuthorized =
    await api.functional.ecommerceMall.auth.administrator.join(
      adminAuthConnection,
      {
        body: {
          display_name: adminAuth.display_name,
          email: adminAuth.email,
          password: adminAuth.display_name,
          grade: typia.assert<"regular">(adminAuth.grade),
        } satisfies IEcommerceMallAdministrator.IJoin,
      },
    );
  typia.assert(adminAuthorized);
  // 3. Retrieve order by order number (assumes order exists in test database)
  // Using a generated order number for testing
  const orderNumber = typia.random<string>();
  const retrievedOrder =
    await api.functional.ecommerceMall.administrator.orders.getByOrdernumber(
      adminAuthConnection,
      { orderNumber },
    );
  typia.assert(retrievedOrder);
  // 4. Validate order structure for pending shipment scenario
  // Order should have empty shipments array (no shipments created yet)
  TestValidator.equals(
    "shipments is empty array",
    retrievedOrder.shipments.length,
    0,
  );
  // 5. Validate order items exist and show appropriate status
  TestValidator.predicate(
    "order has items",
    () => retrievedOrder.items.length > 0,
  );
  // 6. Validate first item status is "paid" (pending shipment)
  if (retrievedOrder.items.length > 0) {
    TestValidator.equals(
      "first item status is paid",
      retrievedOrder.items[0].status,
      "paid",
    );
  }
  // 7. Validate order member reference
  TestValidator.equals(
    "member email present",
    retrievedOrder.member.email.length > 0,
    true,
  );
  // 8. Validate shipping address is present
  TestValidator.equals(
    "shipping address recipient present",
    retrievedOrder.shippingAddress.recipient_name.length > 0,
    true,
  );
  // 9. Validate order status reflects pending state
  TestValidator.predicate(
    "order status indicates pending fulfillment",
    () =>
      retrievedOrder.status === "paid" ||
      retrievedOrder.status === "processing" ||
      retrievedOrder.status === "shipped",
  );
}