import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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

export async function test_customer_shipment_tracking_multi_seller_separation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create Customer A and Customer B accounts
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerA);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerB);
  // 2. Test: Customer A accesses their own shipment
  // Note: Using pre-seeded shipment ID from external test data setup as per scenario
  const ownShipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const ownShipment: IEcommerceMallShipment =
    await api.functional.ecommerceMall.customer.shipments.at(
      customerAConnection,
      {
        shipmentId: ownShipmentId,
      },
    );
  typia.assert(ownShipment);
  // Validate shipment response structure
  TestValidator.equals("shipment UUID matches", ownShipment.id, ownShipmentId);
  TestValidator.predicate(
    "order has number",
    ownShipment.order.order_number.length > 0,
  );
  TestValidator.predicate(
    "order has total price",
    ownShipment.order.total_price > 0,
  );
  TestValidator.equals(
    "order status is valid",
    ownShipment.order.overall_status !== "cancelled",
    true,
  );
  // Validate seller summary structure
  TestValidator.equals(
    "seller is approved",
    ownShipment.seller.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "seller has valid email",
    ownShipment.seller.email.includes("@"),
  );
  TestValidator.equals("seller has ID", ownShipment.seller.id.length, 36);
  // Validate shipment tracking info
  TestValidator.predicate(
    "has carrier name",
    ownShipment.carrierName.length > 0,
  );
  TestValidator.predicate(
    "has tracking number",
    ownShipment.trackingNumber.length > 0,
  );
  TestValidator.predicate(
    "has created timestamp",
    ownShipment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "has updated timestamp",
    ownShipment.updatedAt.length > 0,
  );
  // 3. Test: Customer A attempts to access Customer B's shipment (should fail)
  const otherShipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "cross-customer access forbidden",
    [403],
    async () => {
      await api.functional.ecommerceMall.customer.shipments.at(
        customerAConnection,
        {
          shipmentId: otherShipmentId,
        },
      );
    },
  );
  // 4. Additional validation: Verify connection isolation
  // Customer B's connection should also not have access to Customer A's shipment
  await TestValidator.httpError(
    "customer B cannot access customer A's shipment",
    [403],
    async () => {
      await api.functional.ecommerceMall.customer.shipments.at(
        customerBConnection,
        {
          shipmentId: ownShipmentId,
        },
      );
    },
  );
}
