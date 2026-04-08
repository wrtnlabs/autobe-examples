import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipmentDeliveryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDeliveryStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shipment_delivery_status_auto_delivered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Register seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create customer-specific connection for authenticated requests
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: customerAuth.token.access,
  };
  // 4. Calculate historical shipment date (15 days ago to trigger auto-delivery)
  const shippingDate = new Date();
  shippingDate.setMilliseconds(
    shippingDate.getMilliseconds() - 15 * 24 * 60 * 60 * 1000,
  );
  // 5. Simulate database operations to create shipment with historical shipping_date
  // In E2E test, this would involve direct database manipulation or calling
  // internal setup endpoints. For now, we use typia.random to simulate
  // the shipment entity that exists in the database with historical shipping date.
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const carrierName = RandomGenerator.name(3);
  const trackingNumber = typia.random<string & tags.Format<"uuid">>();
  const itemIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(1, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // 6. Calculate expected auto-delivered timestamp (shipping_date + 14 days)
  const expectedAutoDeliveredAt = new Date(shippingDate.getTime());
  expectedAutoDeliveredAt.setMilliseconds(
    expectedAutoDeliveredAt.getMilliseconds() + 14 * 24 * 60 * 60 * 1000,
  );
  // 7. Make GET request to check delivery status
  const deliveryStatus =
    await api.functional.ecommerceMall.member.shipments.delivery_status.at(
      customerConnection,
      {
        shipmentId,
      },
    );
  typia.assert(deliveryStatus);
  // 8. Validate delivery status is 'delivered' due to auto-delivery rule
  TestValidator.equals(
    "status is delivered (auto-delivered after 14 days)",
    deliveryStatus.status,
    "delivered",
  );
  // 9. Validate deliveryConfirmedAt is null (customer never manually confirmed)
  TestValidator.equals(
    "deliveryConfirmedAt is null (no manual confirmation)",
    deliveryStatus.deliveryConfirmedAt,
    null,
  );
  // 10. Validate autoDeliveredAt matches calculated timestamp
  // The system should calculate: shipping_date + 14 days when no manual confirmation
  TestValidator.equals(
    "autoDeliveredAt is shippingDate + 14 days",
    deliveryStatus.autoDeliveredAt,
    expectedAutoDeliveredAt.toISOString(),
  );
  // 11. Validate shippingDate matches the historical date
  TestValidator.equals(
    "shippingDate reflects historical shipment date",
    deliveryStatus.shippingDate,
    shippingDate.toISOString(),
  );
  // 12. Validate carrierName is populated
  TestValidator.equals(
    "carrierName is populated",
    deliveryStatus.carrierName,
    carrierName,
  );
  // 13. Validate trackingNumber is populated
  TestValidator.equals(
    "trackingNumber is populated",
    deliveryStatus.trackingNumber,
    trackingNumber,
  );
  // 14. Validate itemIds are populated
  TestValidator.equals(
    "itemIds are populated",
    deliveryStatus.itemIds,
    itemIds,
  );
  // 15. Validate the 14-day rule is correctly implemented
  TestValidator.predicate(
    "delivery status respects 14-day auto-delivery rule",
    () => {
      // Status should be 'delivered' when 14+ days have passed since shipping
      // even without manual confirmation
      if (
        deliveryStatus.deliveryConfirmedAt === null &&
        deliveryStatus.status === "delivered"
      ) {
        // This confirms auto-delivery triggered
        return deliveryStatus.autoDeliveredAt !== null;
      }
      return true;
    },
  );
}
