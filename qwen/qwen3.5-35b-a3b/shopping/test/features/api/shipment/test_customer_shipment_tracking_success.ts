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

export async function test_customer_shipment_tracking_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer registration (join)
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // Step 2: Customer login (re-authenticate with credentials)
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_login(customerLoginConnection, {
      body: {
        email: customer.email,
        password: originalPassword,
      } satisfies IEcommerceMallCustomer.ILogin,
    });
  typia.assert(customerLogin);
  // Step 3: Generate a random shipment ID
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 4: Retrieve shipment tracking information
  const shipment: IEcommerceMallShipment =
    await api.functional.ecommerceMall.customer.shipments.at(
      customerLoginConnection,
      { shipmentId },
    );
  typia.assert(shipment);
  // Step 5: Validate shipment tracking response structure
  TestValidator.equals("shipment ID matches request", shipment.id, shipmentId);
  TestValidator.equals("order ID matches", shipment.order.id, shipmentId);
  TestValidator.equals(
    "order number present",
    shipment.order.order_number,
    "test-order-number",
  );
  TestValidator.equals(
    "order overall status present",
    shipment.order.overall_status,
    "shipped",
  );
  // Validate seller summary structure
  TestValidator.equals(
    "seller approval status is valid",
    shipment.seller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "seller email matches",
    shipment.seller.email,
    customer.email,
  );
  // Validate carrier and tracking
  const carrierNames = ["USPS", "FedEx", "DHL", "UPS", "Amazon Logistics"];
  TestValidator.predicate(
    "carrier name is valid",
    carrierNames.includes(shipment.carrierName),
  );
  TestValidator.predicate(
    "tracking number is not empty",
    shipment.trackingNumber.length > 0,
  );
  TestValidator.equals(
    "deletedAt is null for active shipment",
    shipment.deletedAt,
    null,
  );
}
