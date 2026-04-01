import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_shipments_list_by_order(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const shipment =
    await api.functional.mallPlatform.customer.orders.shipments.at(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(shipment);
  TestValidator.predicate(
    "shipment id should be present",
    shipment.id.length > 0,
  );
  TestValidator.predicate(
    "seller summary should be present",
    shipment.seller.id.length > 0,
  );
  TestValidator.predicate(
    "order summary should be present",
    shipment.order.id.length > 0,
  );
  TestValidator.predicate(
    "carrier name should be present",
    shipment.carrierName.length > 0,
  );
  TestValidator.predicate(
    "tracking number should be present",
    shipment.trackingNumber.length > 0,
  );
  TestValidator.predicate(
    "shipment status should be present",
    shipment.status.length > 0,
  );
  TestValidator.predicate(
    "createdAt should be present",
    shipment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be present",
    shipment.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "shippedAt should be nullable timestamp",
    shipment.shippedAt === null || shipment.shippedAt.length > 0,
  );
  TestValidator.predicate(
    "deliveredAt should be nullable timestamp",
    shipment.deliveredAt === null || shipment.deliveredAt.length > 0,
  );
  TestValidator.predicate(
    "trackingUrl should be nullable url",
    shipment.trackingUrl === null || shipment.trackingUrl.length > 0,
  );
  TestValidator.equals(
    "shipment response should reference the requested order shape",
    shipment.order.id,
    shipment.order.id,
  );
}
