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

export async function test_api_shipment_items_reconcile_membership(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234" as string & tags.Format<"password">,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const finalOrderItemIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const before =
    await api.functional.mallPlatform.customer.shipments.items.update(
      customerConnection,
      {
        shipmentId,
        body: {
          orderItemIds: [finalOrderItemIds[0]],
        } satisfies IMallPlatformShipment.IUpdateItem,
      },
    );
  typia.assert(before);
  const after =
    await api.functional.mallPlatform.customer.shipments.items.update(
      customerConnection,
      {
        shipmentId,
        body: {
          orderItemIds: finalOrderItemIds,
        } satisfies IMallPlatformShipment.IUpdateItem,
      },
    );
  typia.assert(after);
  TestValidator.equals("shipment id should remain stable", after.id, before.id);
  TestValidator.equals(
    "shipment seller should remain stable",
    after.seller,
    before.seller,
  );
  TestValidator.equals(
    "shipment order should remain stable",
    after.order,
    before.order,
  );
  TestValidator.equals(
    "carrier name should remain unchanged",
    after.carrierName,
    before.carrierName,
  );
  TestValidator.equals(
    "tracking number should remain unchanged",
    after.trackingNumber,
    before.trackingNumber,
  );
  TestValidator.equals(
    "tracking url should remain unchanged",
    after.trackingUrl,
    before.trackingUrl,
  );
  TestValidator.equals(
    "shipped at should remain unchanged",
    after.shippedAt,
    before.shippedAt,
  );
  TestValidator.equals(
    "delivered at should remain unchanged",
    after.deliveredAt,
    before.deliveredAt,
  );
  TestValidator.equals(
    "status should remain unchanged",
    after.status,
    before.status,
  );
  TestValidator.predicate(
    "shipment response should be returned",
    () => after.deletedAt === before.deletedAt,
  );
}
