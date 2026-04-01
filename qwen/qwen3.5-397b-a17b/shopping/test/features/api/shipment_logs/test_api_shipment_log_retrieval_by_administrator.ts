import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test administrator retrieval of shipment lifecycle event log.
 *
 * This test validates that:
 * 1. Administrator can authenticate successfully
 * 2. Seller can create a shipment which generates a 'created' event log
 * 3. Administrator can retrieve the shipment log by ID
 * 4. The log contains all required fields with correct values
 * 5. The shipment summary in the log is properly populated
 */
export async function test_api_shipment_log_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Administrator login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 3. Seller setup - create account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 4. Seller login
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 5. Seller creates shipment (generates 'created' event log)
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        tracking_number: typia.random<string & tags.Format<"uuid">>(),
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 6. Verify shipment has at least one log entry
  TestValidator.predicate("shipment has logs", () => shipment.logs.length > 0);
  // 7. Get the created event log
  const createdLog = shipment.logs.find((log) => log.eventType === "created");
  TestValidator.predicate("created log exists", () => createdLog !== undefined);
  const logId = createdLog!.id;
  // 8. Administrator retrieves the shipment log by ID
  const retrievedLog =
    await api.functional.shoppingMall.administrator.shipment_logs.at(
      adminConnection,
      {
        logId: logId,
      },
    );
  typia.assert(retrievedLog);
  // 9. Validate log core fields
  TestValidator.equals("log ID matches", retrievedLog.id, logId);
  TestValidator.equals(
    "event type is created",
    retrievedLog.eventType,
    "created",
  );
  TestValidator.equals(
    "actor type is seller",
    retrievedLog.actorType,
    "seller",
  );
  TestValidator.predicate(
    "actor ID exists for seller event",
    () => retrievedLog.actorId !== null,
  );
  TestValidator.equals(
    "old status is null for creation",
    retrievedLog.oldStatus,
    null,
  );
  TestValidator.predicate(
    "new status exists",
    () => retrievedLog.newStatus !== null,
  );
  // 10. Validate shipment summary in log
  TestValidator.equals(
    "shipment ID matches",
    retrievedLog.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "tracking carrier matches",
    retrievedLog.shipment.trackingCarrier,
    shipment.tracking_carrier,
  );
  TestValidator.equals(
    "tracking number matches",
    retrievedLog.shipment.trackingNumber,
    shipment.tracking_number,
  );
  TestValidator.equals(
    "shipped at matches",
    retrievedLog.shipment.shippedAt,
    shipment.shipped_at,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedLog.shipment.seller.id,
    shipment.seller.id,
  );
}