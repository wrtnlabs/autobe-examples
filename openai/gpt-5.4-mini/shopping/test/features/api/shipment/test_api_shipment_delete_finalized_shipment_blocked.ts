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

export async function test_api_shipment_delete_finalized_shipment_blocked(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "1234!@#$" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipment =
    await generate_random_mall_platform_administrator_shipments_create(
      administratorConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          trackingUrl: `https://tracking.example.com/${RandomGenerator.alphaNumeric(10)}`,
        },
      },
    );
  typia.assert(shipment);
  const snapshot: IMallPlatformShipment = shipment;
  await TestValidator.error(
    "finalized shipment deletion should be blocked",
    async () => {
      await api.functional.mallPlatform.administrator.shipments.erase(
        administratorConnection,
        {
          shipmentId: shipment.id,
        },
      );
    },
  );
  TestValidator.equals("shipment id preserved", shipment.id, snapshot.id);
  TestValidator.equals(
    "shipment seller preserved",
    shipment.seller,
    snapshot.seller,
  );
  TestValidator.equals(
    "shipment order preserved",
    shipment.order,
    snapshot.order,
  );
  TestValidator.equals(
    "shipment carrier preserved",
    shipment.carrierName,
    snapshot.carrierName,
  );
  TestValidator.equals(
    "shipment tracking number preserved",
    shipment.trackingNumber,
    snapshot.trackingNumber,
  );
  TestValidator.equals(
    "shipment status preserved",
    shipment.status,
    snapshot.status,
  );
  TestValidator.equals(
    "shipment shippedAt preserved",
    shipment.shippedAt,
    snapshot.shippedAt,
  );
  TestValidator.equals(
    "shipment deliveredAt preserved",
    shipment.deliveredAt,
    snapshot.deliveredAt,
  );
  TestValidator.equals(
    "shipment createdAt preserved",
    shipment.createdAt,
    snapshot.createdAt,
  );
  TestValidator.equals(
    "shipment updatedAt preserved",
    shipment.updatedAt,
    snapshot.updatedAt,
  );
  TestValidator.equals(
    "shipment deletedAt preserved",
    shipment.deletedAt,
    snapshot.deletedAt,
  );
}
