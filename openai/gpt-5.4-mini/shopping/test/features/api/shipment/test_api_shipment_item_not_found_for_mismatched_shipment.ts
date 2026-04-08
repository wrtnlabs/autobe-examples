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
import { generate_random_mall_platform_administrator_shipments_create } from "../../../generate/generate_random_mall_platform_administrator_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";

export async function test_api_shipment_item_not_found_for_mismatched_shipment(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password:
        "1234!@#a" satisfies IMallPlatformAdministrator.IJoin["password"],
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "missing shipment item should return not found",
    404,
    async () =>
      api.functional.mallPlatform.administrator.shipments.items.getByShipmentidAndShipmentitemid(
        adminConnection,
        {
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
          shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
  const shipment =
    await api.functional.mallPlatform.administrator.shipments.create(
      adminConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IMallPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  await TestValidator.httpError(
    "shipment item lookup with mismatched or absent assignment should return not found",
    [404],
    async () =>
      api.functional.mallPlatform.administrator.shipments.items.getByShipmentidAndShipmentitemid(
        adminConnection,
        {
          shipmentId: shipment.id,
          shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
