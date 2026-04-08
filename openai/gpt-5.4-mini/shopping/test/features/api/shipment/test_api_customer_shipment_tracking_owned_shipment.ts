import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_shipments_create } from "../../../generate/generate_random_mall_platform_seller_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";

export async function test_api_customer_shipment_tracking_owned_shipment(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const shipment = await generate_random_mall_platform_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(18),
        trackingUrl: typia.random<string & tags.Format<"url">>(),
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const tracking =
    await api.functional.mallPlatform.customer.shipments.tracking.at(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(tracking);
  TestValidator.equals("shipment id should match", tracking.id, shipment.id);
  TestValidator.equals(
    "carrier name should match",
    tracking.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "tracking number should match",
    tracking.trackingNumber,
    shipment.trackingNumber,
  );
  TestValidator.equals(
    "seller summary should match",
    tracking.seller,
    shipment.seller,
  );
  TestValidator.equals(
    "order summary should match",
    tracking.order,
    shipment.order,
  );
  TestValidator.equals(
    "tracking url should match",
    tracking.trackingUrl,
    shipment.trackingUrl,
  );
}
