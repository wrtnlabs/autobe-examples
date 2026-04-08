import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

export async function test_api_customer_shipment_confirm_delivery_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      href: "https://example.com",
      referrer: "https://example.com",
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" as string & tags.Format<"password">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const shipment =
    await api.functional.mallPlatform.customer.shipments.confirm_delivery.create(
      customerConnection,
      {
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(shipment);
  TestValidator.predicate("shipment id is present", shipment.id.length > 0);
  TestValidator.predicate(
    "shipment has seller info",
    shipment.seller.id.length > 0,
  );
  TestValidator.predicate(
    "shipment has order info",
    shipment.order.id.length > 0,
  );
  TestValidator.equals("shipment is delivered", shipment.status, "delivered");
  TestValidator.predicate(
    "shipment deliveredAt is set",
    shipment.deliveredAt !== null,
  );
  TestValidator.predicate(
    "shipment is not deleted",
    shipment.deletedAt === null,
  );
}
