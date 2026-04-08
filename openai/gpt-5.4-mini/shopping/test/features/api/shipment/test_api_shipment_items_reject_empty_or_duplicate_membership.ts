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

export async function test_api_shipment_items_reject_empty_or_duplicate_membership(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com` as string &
        tags.Format<"email">,
      password: "Test1234!" as string & tags.Format<"password">,
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
      ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const duplicateItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "shipment item membership update should reject empty membership",
    async () => {
      await api.functional.mallPlatform.customer.shipments.items.update(
        customerConnection,
        {
          shipmentId,
          body: {
            orderItemIds: [],
          } satisfies IMallPlatformShipment.IUpdateItem,
        },
      );
    },
  );
  await TestValidator.error(
    "shipment item membership update should reject duplicate membership",
    async () => {
      await api.functional.mallPlatform.customer.shipments.items.update(
        customerConnection,
        {
          shipmentId,
          body: {
            orderItemIds: [itemId, duplicateItemId, duplicateItemId],
          } satisfies IMallPlatformShipment.IUpdateItem,
        },
      );
    },
  );
}
