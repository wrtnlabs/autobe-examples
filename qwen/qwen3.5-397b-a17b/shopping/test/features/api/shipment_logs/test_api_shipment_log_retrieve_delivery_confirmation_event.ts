import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test shipment log retrieval for delivery confirmation event.
 *
 * This test validates that when a customer confirms delivery of a shipment,
 * a 'delivery_confirmed' log entry is created with correct actor information,
 * and the seller can retrieve this log entry to verify the audit trail.
 *
 * Workflow:
 * 1. Seller registers and logs in
 * 2. Seller creates a shipment (using utility that handles order item preparation)
 * 3. Customer registers and logs in
 * 4. Customer confirms delivery of the shipment
 * 5. Seller retrieves the delivery confirmation log entry
 * 6. Verify log contains correct event_type, actor_type, actor_id, status transitions, and metadata
 */
export async function test_api_shipment_log_retrieve_delivery_confirmation_event(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for later login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Create shipment using utility function
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(shipment);
  // Verify shipment was created with shipped status
  TestValidator.equals(
    "shipment has tracking carrier",
    typeof shipment.tracking_carrier,
    "string",
  );
  TestValidator.equals(
    "shipment has tracking number",
    typeof shipment.tracking_number,
    "string",
  );
  TestValidator.predicate(
    "shipment has shipped_at timestamp",
    shipment.shipped_at !== null,
  );
  TestValidator.predicate(
    "shipment not yet confirmed",
    shipment.confirmed_at === null,
  );
  // 3. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 4. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerLoginConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // Verify delivery was confirmed
  TestValidator.predicate(
    "shipment confirmed_at is set",
    confirmedShipment.confirmed_at !== null,
  );
  // 5. Find the delivery_confirmed log entry from the shipment logs
  const deliveryConfirmedLog = confirmedShipment.logs.find(
    (log) => log.eventType === "delivery_confirmed",
  );
  TestValidator.predicate(
    "delivery_confirmed log exists",
    deliveryConfirmedLog !== undefined,
  );
  if (deliveryConfirmedLog === undefined) {
    throw new Error("delivery_confirmed log entry not found in shipment logs");
  }
  // 6. Seller retrieves the delivery confirmation log using the log ID
  const retrievedLog =
    await api.functional.shoppingMall.seller.shipment_logs.at(
      sellerLoginConnection,
      {
        logId: deliveryConfirmedLog.id,
      },
    );
  typia.assert(retrievedLog);
  // 7. Verify log contains correct data
  TestValidator.equals(
    "event_type is delivery_confirmed",
    retrievedLog.eventType,
    "delivery_confirmed",
  );
  TestValidator.equals(
    "actor_type is customer",
    retrievedLog.actorType,
    "customer",
  );
  TestValidator.predicate(
    "actor_id references customer",
    retrievedLog.actorId !== null,
  );
  TestValidator.equals(
    "actor_id is customer ID",
    retrievedLog.actorId,
    customerAuth.id,
  );
  TestValidator.equals(
    "old_status is shipped",
    retrievedLog.oldStatus,
    "shipped",
  );
  TestValidator.equals(
    "new_status is delivered",
    retrievedLog.newStatus,
    "delivered",
  );
  TestValidator.predicate("metadata exists", retrievedLog.metadata !== null);
  TestValidator.predicate(
    "created_at is valid timestamp",
    retrievedLog.createdAt !== null,
  );
  // 8. Verify shipment reference in log
  TestValidator.equals(
    "log shipment ID matches",
    retrievedLog.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "log shipment carrier matches",
    retrievedLog.shipment.trackingCarrier,
    shipment.tracking_carrier,
  );
  TestValidator.equals(
    "log shipment tracking number matches",
    retrievedLog.shipment.trackingNumber,
    shipment.tracking_number,
  );
}