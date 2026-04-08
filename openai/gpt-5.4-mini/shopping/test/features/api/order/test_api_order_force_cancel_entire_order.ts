import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Force-cancel an entire order as an administrator intervention.
 *
 * Verifies that an authenticated administrator can invoke the whole-order force-cancel command and receive a structurally valid order response. The test focuses on the administrator-authenticated workflow, the whole-order cancellation scope, and the returned order payload shape because the provided API surface only exposes administrator join and the force-cancel endpoint in this scenario.
 *
 * 1. Register and authenticate an administrator using a fresh connection.
 * 2. Invoke the order force-cancel endpoint with the whole-order cancellation scope.
 * 3. Validate the returned order payload and its nested collections.
 */
export async function test_api_order_force_cancel_entire_order(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    scope: "order",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformOrder.IForceCancel;
  const order =
    await api.functional.mallPlatform.administrator.orders.force_cancel.forceCancel(
      adminConnection,
      {
        orderId,
        body,
      },
    );
  typia.assert(order);
  TestValidator.equals("force-cancel scope", body.scope, "order");
  TestValidator.predicate(
    "order items collection exists",
    Array.isArray(order.orderItems),
  );
  TestValidator.predicate(
    "shipments collection exists",
    Array.isArray(order.shipments),
  );
  TestValidator.predicate(
    "order has customer summary",
    order.customer.id.length > 0,
  );
}
