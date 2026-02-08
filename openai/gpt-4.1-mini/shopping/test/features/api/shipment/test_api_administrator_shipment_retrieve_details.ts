import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_administrator_shipment_retrieve_details(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve shipment details successfully as an authenticated administrator
  // - Setup: Register and authenticate a seller, create a shipment by the seller.
  // - Setup: Register and authenticate an administrator.
  // - Action: Administrator retrieves the shipment using its shipmentId.
  // - Validate: Response status 200 with correct shipment details including id, seller_id, status, created_at, updated_at, deleted_at (null if not deleted), and embedded seller summary.
  // - Validate: Authorization check confirms only authorized administrators can access data.
  // Scenario 2: Attempt to retrieve a shipment that does not exist
  // - Setup: Authenticate an administrator.
  // - Action: Administrator attempts to retrieve a shipment with a non-existent shipmentId UUID.
  // - Validate: Response status 404 Not Found error.
  // Scenario 3: Unauthorized access attempt by non-administrator
  // - Setup: Authenticate a customer or seller (non-admin).
  // - Action: Attempt to retrieve any shipment by shipmentId.
  // - Validate: Response status 403 Forbidden error due to lack of authorization.
  // Implementation
  // Base connection
  // 1. Seller join and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinOutput = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerJoinOutput);
  const sellerConnection: api.IConnection = { host: connection.host };
  // Login seller with same credentials as join (simulate for ILogin by partial)
  const sellerLoginOutput = await authorize_seller_login(sellerConnection, {
    body: {},
  });
  typia.assert(sellerLoginOutput);
  // 2. Seller creates a shipment
  const shipmentRaw = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: undefined },
  );
  const shipment = shipmentRaw as any;
  // 3. Administrator join and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_administrator_join(
    adminJoinConnection,
    { body: typia.random<IShoppingMallAdministrator.IJoin>() },
  );
  typia.assert(adminJoinOutput);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginOutput = await authorize_administrator_login(
    adminConnection,
    { body: {} },
  );
  typia.assert(adminLoginOutput);
  // Scenario 1: Administrator retrieves the shipment
  const fetchedShipmentRaw =
    await api.functional.shoppingMall.administrator.shipments.at(
      adminConnection,
      { shipmentId: shipment.id },
    );
  const fetchedShipment = fetchedShipmentRaw as any;
  typia.assert(fetchedShipment);
  TestValidator.equals("shipment id", fetchedShipment.id, shipment.id);
  TestValidator.equals(
    "shipment seller_id",
    fetchedShipment.seller_id,
    shipment.seller_id,
  );
  TestValidator.equals(
    "shipment status",
    fetchedShipment.status,
    shipment.status,
  );
  TestValidator.equals(
    "shipment created_at",
    fetchedShipment.created_at,
    shipment.created_at,
  );
  TestValidator.equals(
    "shipment updated_at",
    fetchedShipment.updated_at,
    shipment.updated_at,
  );
  TestValidator.equals(
    "shipment deleted_at",
    fetchedShipment.deleted_at,
    shipment.deleted_at,
  );
  // Scenario 2: Administrator retrieves a non-existent shipment
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent shipment retrieval",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.shipments.at(
        adminConnection,
        { shipmentId: nonExistentShipmentId },
      );
    },
  );
  // Scenario 3: Unauthorized retrieval attempt by seller
  await TestValidator.httpError(
    "unauthorized shipment retrieval by seller",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.shipments.at(
        sellerConnection,
        { shipmentId: shipment.id },
      );
    },
  );
}
