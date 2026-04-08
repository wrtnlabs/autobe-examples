import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
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

export async function test_api_shipment_create_reject_mixed_seller_or_assigned_items(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.error(
    "administrator shipment creation should reject mixed-seller or already-assigned order items",
    async () => {
      await generate_random_mall_platform_administrator_shipments_create(
        adminConnection,
        {
          body: {
            carrierName: RandomGenerator.name(2),
            trackingNumber: RandomGenerator.alphaNumeric(12),
            orderItemIds: ArrayUtil.repeat(2, () =>
              typia.random<string & tags.Format<"uuid">>(),
            ),
          } satisfies IMallPlatformShipment.ICreate,
        },
      );
    },
  );
}
