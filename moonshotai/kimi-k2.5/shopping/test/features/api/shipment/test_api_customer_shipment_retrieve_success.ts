import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipment_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000/customer/join",
      referrer: "http://localhost:3000/",
    },
  });
  // 2. Use a random UUID for shipment ID - assumed to exist via prerequisite setup
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the shipment
  const shipment = await api.functional.ecommerceMall.customer.shipments.at(
    customerConnection,
    { shipmentId },
  );
  // 4. Validate complete shipment structure
  typia.assert(shipment);
  // 5. Validate business logic - verify required fields are present
  TestValidator.predicate("shipment has valid id", shipment.id === shipmentId);
  TestValidator.predicate(
    "shipment has carrier name",
    typeof shipment.carrier_name === "string",
  );
  TestValidator.predicate(
    "shipment has tracking number",
    typeof shipment.tracking_number === "string",
  );
  TestValidator.predicate(
    "shipment has valid status",
    shipment.status === "in_transit" || shipment.status === "delivered",
  );
  TestValidator.predicate(
    "shipment has seller information",
    shipment.seller !== null && shipment.seller !== undefined,
  );
  TestValidator.predicate(
    "shipment has shipment items array",
    Array.isArray(shipment.shipment_items),
  );
  // 6. Validate embedded snapshot data when shipment items exist
  if (shipment.shipment_items.length > 0) {
    TestValidator.predicate(
      "shipment items contain valid order items",
      shipment.shipment_items.every(
        (item) =>
          item.orderItem !== null &&
          item.orderItem !== undefined &&
          item.orderItem.product !== null &&
          item.orderItem.variant !== null,
      ),
    );
  }
}
