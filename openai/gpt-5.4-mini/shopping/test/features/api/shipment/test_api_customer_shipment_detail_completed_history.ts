import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipment_detail_completed_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/mallPlatform/customer/shipments/history",
      referrer: "https://example.com/mallPlatform/customer/orders",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const shipment = await api.functional.mallPlatform.customer.shipments.at(
    customerConnection,
    {
      shipmentId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(shipment);
  TestValidator.predicate("shipment has an identifier", shipment.id.length > 0);
  TestValidator.predicate(
    "shipment has seller summary",
    shipment.seller.id.length > 0,
  );
  TestValidator.predicate(
    "shipment has order summary",
    shipment.order.id.length > 0,
  );
  TestValidator.predicate(
    "shipment has carrier name",
    shipment.carrierName.length > 0,
  );
  TestValidator.predicate(
    "shipment has tracking number",
    shipment.trackingNumber.length > 0,
  );
  TestValidator.predicate(
    "shipment has a status value",
    shipment.status.length > 0,
  );
  TestValidator.predicate(
    "shipment has shipment items array",
    Array.isArray(shipment.shipmentItems),
  );
  TestValidator.predicate(
    "shipment item references are preserved",
    shipment.shipmentItems.every(
      (item) => item.shipment.id.length > 0 && item.orderItem.id.length > 0,
    ),
  );
  TestValidator.predicate(
    "shipment timestamps are read-only fields when present",
    shipment.createdAt.length > 0 && shipment.updatedAt.length > 0,
  );
}
