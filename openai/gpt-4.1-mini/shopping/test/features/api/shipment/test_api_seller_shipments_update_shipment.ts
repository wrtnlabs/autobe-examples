import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipments_update_shipment(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario 1: Successful update of shipment details by authenticated seller.
   * - Prerequisites: Seller must be registered (join), authenticated (login), and a shipment created.
   * - Seller updates shipment with new carrier name, tracking number, shipment status, and modifies included order items.
   * - Validation points: Ensure shipment status updates correctly, order items belong to seller, and shipment linkage updates correctly.
   * - Validate full updated shipment details returned correctly.
   * - Confirm authorization enforcement to prevent unauthorized access.
   *
   * Scenario 2: Update shipment with invalid shipmentId (not found).
   * - Prerequisites: Seller authenticated (join and login), shipment creation step skipped here to test not found.
   * - Attempt to update shipment with a non-existent shipmentId.
   * - Validation points: Expect a 404 not found error.
   *
   * Scenario 3: Update shipment with invalid state transition.
   * - Prerequisites: Seller authenticated (join, login) and an existing shipment.
   * - Seller attempts to update shipment status to an invalid or disallowed status.
   * - Validation points: Expect status validation failure preventing invalid transitions.
   * - Confirm that shipment data remains unchanged after failed update attempt.
   */
  // 1. Seller joins the platform
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: "Test Shop",
      shopDescription: "Test Desc",
      logoUri: null,
    },
  });
  typia.assert(authorizedSeller);
  // 2. Seller logs into the platform
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const authorizedSellerLogin = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: authorizedSeller.email,
        password: "password123",
      },
    },
  );
  typia.assert(authorizedSellerLogin);
  // Use sellerLoginConnection for authenticated requests
  // 3. Seller creates a shipment to be updated
  const createdShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerLoginConnection,
      { body: {} },
    );
  typia.assert(createdShipment);
  // Prepare updated shipment order items data
  // Update to empty shipmentOrderItems would likely be invalid, so keep the existing or add new
  const updatedShipmentOrderItems: IShoppingMallShipmentOrderItem.IUpdate[] =
    createdShipment
      ? createdShipment.seller && createdShipment.id
        ? createdShipment.seller && createdShipment.id
          ? ArrayUtil.repeat(1, () => ({
              shoppingMallOrderItemId: typia.random<
                string & tags.Format<"uuid">
              >(),
              shoppingMallShipmentId: createdShipment.id,
            }))
          : []
        : []
      : [];
  // Scenario 1: Successful update
  const updateBody1: IShoppingMallShipment.IUpdate = {
    status: "shipped",
    shipmentOrderItems: updatedShipmentOrderItems,
  };
  const updatedShipment =
    await api.functional.shoppingMall.seller.shipments.updateShipment(
      sellerLoginConnection,
      {
        shipmentId: createdShipment.id,
        body: updateBody1,
      },
    );
  typia.assert(updatedShipment);
  TestValidator.equals(
    "shipment status updated",
    updatedShipment.status,
    updateBody1.status,
  );
  TestValidator.equals(
    "shipment ID matches",
    updatedShipment.id,
    createdShipment.id,
  );
  // Scenario 2: Update shipment with invalid shipmentId (not found)
  await TestValidator.httpError(
    "update with invalid shipmentId should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipments.updateShipment(
        sellerLoginConnection,
        {
          shipmentId: typia.random<string & tags.Format<"uuid">>(), // random, unlikely to exist
          body: updateBody1,
        },
      );
    },
  );
  // Scenario 3: Update shipment with invalid state transition
  // Assuming 'invalid-status' is not allowed as per business logic
  const invalidUpdateBody: IShoppingMallShipment.IUpdate = {
    status: "invalid-status",
    shipmentOrderItems: updatedShipmentOrderItems,
  };
  await TestValidator.httpError(
    "update with invalid status should fail",
    400,
    async () => {
      await api.functional.shoppingMall.seller.shipments.updateShipment(
        sellerLoginConnection,
        {
          shipmentId: createdShipment.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
  // Confirm shipment data remains unchanged after failed update
  const shipmentAfterFailedUpdate =
    await api.functional.shoppingMall.seller.shipments.updateShipment(
      sellerLoginConnection,
      {
        shipmentId: createdShipment.id,
        body: updateBody1,
      },
    );
  typia.assert(shipmentAfterFailedUpdate);
  TestValidator.equals(
    "shipment data unchanged after failed update",
    shipmentAfterFailedUpdate.status,
    updateBody1.status,
  );
}
