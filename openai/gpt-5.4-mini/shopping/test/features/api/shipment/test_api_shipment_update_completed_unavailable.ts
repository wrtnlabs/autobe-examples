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
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_shipments_create } from "../../../generate/generate_random_mall_platform_seller_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";
import { prepare_random_mall_platform_shipment_item } from "../../../prepare/prepare_random_mall_platform_shipment_item";

export async function test_api_shipment_update_completed_unavailable(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail: string = `${RandomGenerator.alphabets(8)}@example.com`;
  const sellerPassword: string = "Password123!";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const shipment = await generate_random_mall_platform_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: RandomGenerator.name(2),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        shipmentItems: [prepare_random_mall_platform_shipment_item()],
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const attemptedCarrierName = `${RandomGenerator.name(2)} updated`;
  const attemptedTrackingNumber = RandomGenerator.alphaNumeric(16);
  await TestValidator.httpError(
    "completed or unavailable shipment cannot be updated",
    [400, 403, 409, 422],
    async () => {
      await api.functional.mallPlatform.seller.shipments.update(
        sellerConnection,
        {
          shipmentId: shipment.id,
          body: {
            carrierName: attemptedCarrierName,
            trackingNumber: attemptedTrackingNumber,
          } satisfies IMallPlatformShipment.IUpdate,
        },
      );
    },
  );
  const currentShipment =
    await api.functional.mallPlatform.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          carrierName: shipment.carrierName,
          trackingNumber: shipment.trackingNumber,
        } satisfies IMallPlatformShipment.IUpdate,
      },
    );
  typia.assert(currentShipment);
  TestValidator.equals(
    "shipment carrier name remains unchanged",
    currentShipment.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "shipment tracking number remains unchanged",
    currentShipment.trackingNumber,
    shipment.trackingNumber,
  );
}
