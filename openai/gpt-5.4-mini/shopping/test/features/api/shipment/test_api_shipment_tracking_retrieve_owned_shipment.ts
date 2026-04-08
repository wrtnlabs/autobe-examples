import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shipment_tracking_retrieve_owned_shipment(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorizedSeller);
  const shipment =
    await api.functional.mallPlatform.seller.shipments.tracking.at(
      sellerConnection,
      {
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment response is a shipment-level tracking record",
    shipment.seller.id,
    authorizedSeller.id,
  );
  TestValidator.predicate(
    "shipment has a carrier name",
    shipment.carrierName.trim().length > 0,
  );
  TestValidator.predicate(
    "shipment has a tracking number",
    shipment.trackingNumber.trim().length > 0,
  );
  TestValidator.predicate(
    "shipment status is populated",
    shipment.status.trim().length > 0,
  );
  TestValidator.predicate(
    "tracking url is optional and, when present, is not empty",
    shipment.trackingUrl === null || shipment.trackingUrl.trim().length > 0,
  );
  TestValidator.predicate(
    "shippedAt is nullable as defined",
    shipment.shippedAt === null || shipment.shippedAt.length > 0,
  );
  TestValidator.predicate(
    "deliveredAt is nullable as defined",
    shipment.deliveredAt === null || shipment.deliveredAt.length > 0,
  );
  TestValidator.predicate(
    "linked order summary exists",
    shipment.order.id.trim().length > 0 &&
      shipment.order.orderNumber.trim().length > 0,
  );
}
