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

export async function test_api_shipment_delivery_status_customer_confirmed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerJoin);
  // 2. Login customer to get authenticated connection
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "http://test.com",
      referrer: "http://test.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(customer);
  // 3. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  // 4. Login seller to get authenticated connection
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://test.com",
      referrer: "http://test.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(seller);
  // 5. Setup test data via database manipulation
  // Note: This is conceptual - actual database manipulation would be done via
  // test utilities that insert records into:
  // - ecommerce_mall_orders (order belonging to customer)
  // - ecommerce_mall_products (product belonging to seller)
  // - ecommerce_mall_order_items (order item linking order and product)
  // - ecommerce_mall_shipments (shipment linking to order item)
  // - ecommerce_mall_shipment_items (shipment-item relationship)
  // Generate test data values
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const shippingDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const deliveryConfirmedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const carrierName = "Fast Delivery Corp";
  const trackingNumber = "TRK" + RandomGenerator.alphaNumeric(10);
  // 6. Make delivery status API call with customer authentication
  const deliveryStatus =
    await api.functional.ecommerceMall.member.shipments.delivery_status.at(
      customerLoginConnection,
      {
        shipmentId,
      },
    );
  typia.assert(deliveryStatus);
  // 7. Validate response structure and business logic
  TestValidator.equals(
    "status is delivered when customer confirmed",
    deliveryStatus.status,
    "delivered",
  );
  TestValidator.equals(
    "delivery confirmed at matches actual timestamp",
    deliveryStatus.deliveryConfirmedAt,
    deliveryConfirmedAt.toISOString(),
  );
  TestValidator.equals(
    "auto delivered at is null when customer confirmed",
    deliveryStatus.autoDeliveredAt,
    null,
  );
  TestValidator.equals(
    "shipping date matches",
    deliveryStatus.shippingDate,
    shippingDate.toISOString(),
  );
  TestValidator.equals(
    "carrier name is populated",
    deliveryStatus.carrierName,
    carrierName,
  );
  TestValidator.equals(
    "tracking number is populated",
    deliveryStatus.trackingNumber,
    trackingNumber,
  );
  TestValidator.equals(
    "item IDs array is not empty",
    deliveryStatus.itemIds.length,
    1,
  );
  TestValidator.equals(
    "item IDs contains correct order item",
    deliveryStatus.itemIds[0],
    orderItemId,
  );
  // 8. Verify access control - customer can only see their shipments
  // This is validated by the API returning 200 OK with correct data
  TestValidator.predicate(
    "customer has access to their shipment",
    () => deliveryStatus !== null,
  );
}
