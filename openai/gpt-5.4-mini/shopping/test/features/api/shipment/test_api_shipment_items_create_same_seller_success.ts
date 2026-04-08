import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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
import { generate_random_mall_platform_administrator_shipments_items_create } from "../../../generate/generate_random_mall_platform_administrator_shipments_items_create";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

export async function test_api_shipment_items_create_same_seller_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator shipment-item creation for eligible items from the same seller.
   *
   * This test validates the fulfillment workflow where an administrator attaches
   * one or more shippable order items to an existing shipment owned by a single
   * seller. It focuses on the returned shipment-item association and the nested
   * shipment and order-item context preserved in the response.
   *
   * 1. Authenticate an administrator in an isolated connection.
   * 2. Create a valid shipment-item association through the generated E2E helper.
   * 3. Validate the response structure and confirm nested shipment/order context.
   * 4. Ensure the shipment-item membership is active and references the same seller context.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!AaBb",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await generate_random_mall_platform_administrator_shipments_items_create(
      adminConnection,
      {
        params: {
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          orderItemIds: ArrayUtil.repeat(2, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
        } satisfies IMallPlatformShipmentItem.ICreate,
      },
    );
  typia.assert(output);
  TestValidator.predicate("shipment item is active", output.deletedAt === null);
  TestValidator.predicate(
    "shipment context preserved",
    output.shipment.id.length > 0 && output.shipment.order.id.length > 0,
  );
  TestValidator.predicate(
    "order item context preserved",
    output.orderItem.id.length > 0 && output.orderItem.seller.id.length > 0,
  );
}
