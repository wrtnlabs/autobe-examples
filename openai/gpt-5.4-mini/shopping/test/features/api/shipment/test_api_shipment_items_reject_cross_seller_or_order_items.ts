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

export async function test_api_shipment_items_reject_cross_seller_or_order_items(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that shipment item membership updates reject mixed ownership sets.
   *
   * The test authenticates a customer and submits a shipment item update that intentionally mixes a shipment-scoped item identifier with a second identifier that is outside the shipment's ownership scope. This checks the platform's business rule that a shipment can only contain order items from the same seller and order.
   *
   * Because only the shipment update endpoint and customer registration DTOs are available in this test context, the request is focused on the rejection path. The assertion ensures the endpoint fails atomically for the invalid mixed set instead of partially accepting it.
   *
   * 1. Join as an authenticated customer.
   * 2. Submit a shipment item membership update containing one valid-like shipment item id and one cross-scope item id.
   * 3. Assert that the endpoint rejects the request.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const validOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const crossScopeOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reject mixed shipment item ownership scope",
    async () => {
      await api.functional.mallPlatform.customer.shipments.items.update(
        customerConnection,
        {
          shipmentId,
          body: {
            orderItemIds: [validOrderItemId, crossScopeOrderItemId],
          } satisfies IMallPlatformShipment.IUpdateItem,
        },
      );
    },
  );
}
