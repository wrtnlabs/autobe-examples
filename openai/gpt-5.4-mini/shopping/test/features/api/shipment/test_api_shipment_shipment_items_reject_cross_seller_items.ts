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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipment_shipment_items_reject_cross_seller_items(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register" as string,
      referrer: "https://example.com/" as string,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const initialItems =
    await api.functional.mallPlatform.customer.shipments.shipmentItems.index(
      customerConnection,
      {
        shipmentId,
        body: {
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IMallPlatformShipmentItem.IUpdate,
      },
    );
  typia.assert(initialItems);
  const originalItemIds = initialItems.data.map((item) => item.orderItem.id);
  const crossSellerItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reject cross-seller shipment composition update",
    async () => {
      await api.functional.mallPlatform.customer.shipments.shipmentItems.index(
        customerConnection,
        {
          shipmentId,
          body: {
            orderItemIds: [...originalItemIds, crossSellerItemId],
          } satisfies IMallPlatformShipmentItem.IUpdate,
        },
      );
    },
  );
  const after =
    await api.functional.mallPlatform.customer.shipments.shipmentItems.index(
      customerConnection,
      {
        shipmentId,
        body: {
          orderItemIds: originalItemIds,
        } satisfies IMallPlatformShipmentItem.IUpdate,
      },
    );
  typia.assert(after);
  TestValidator.equals(
    "shipment items remain unchanged",
    after.data.map((item) => item.orderItem.id),
    originalItemIds,
  );
  TestValidator.equals(
    "shipment composition count remains unchanged",
    after.data.length,
    initialItems.data.length,
  );
}
