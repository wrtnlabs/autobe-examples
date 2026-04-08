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

export async function test_api_customer_shipment_tracking_forbidden_for_other_customer(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Deny cross-customer shipment tracking access.
   *
   * This test validates that shipment tracking information is restricted to the
   * owning customer. It creates one customer who will attempt unauthorized
   * access, a second customer who owns the target shipment, and a seller who
   * creates the shipment for that second customer. The first customer then tries
   * to read the tracking details for the other customer's shipment and must be
   * rejected by the authorization layer.
   *
   * 1. Register two customer accounts and one seller account.
   * 2. Create a shipment for the second customer's order using the seller.
   * 3. Attempt to read the shipment tracking with the first customer's session.
   * 4. Confirm the request is denied and tracking details are not exposed.
   */
  const requesterConnection: api.IConnection = { host: connection.host };
  const ownerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const requesterEmail = typia.random<string & tags.Format<"email">>();
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const requesterPassword = RandomGenerator.alphaNumeric(16);
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(requesterConnection, {
    body: {
      email: requesterEmail,
      password: requesterPassword,
      href: "https://example.com/customer/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await authorize_customer_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      href: "https://example.com/customer/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
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
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        trackingUrl: `https://tracking.example.com/${RandomGenerator.alphaNumeric(8)}`,
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IMallPlatformShipment.ICreate,
    },
  );
  typia.assert(shipment);
  await TestValidator.httpError(
    "shipment tracking should be forbidden for a different customer",
    403,
    async () => {
      await api.functional.mallPlatform.customer.shipments.tracking.at(
        requesterConnection,
        {
          shipmentId: shipment.id,
        },
      );
    },
  );
}
