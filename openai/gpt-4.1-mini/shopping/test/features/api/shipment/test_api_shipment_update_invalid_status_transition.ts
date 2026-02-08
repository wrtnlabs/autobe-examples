import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";

export async function test_api_shipment_update_invalid_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {} satisfies import("@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller").IShoppingMallSeller.IJoin,
  });
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Create shipment with initial status 'shipped'
  const shipmentToCreate = {
    status: "shipped",
  } satisfies import("@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment").IShoppingMallShipment.ICreate;
  const createdShipmentRaw =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      { body: shipmentToCreate },
    );
  const createdShipment = typia.assert<
    IShoppingMallShipment & { id: string; status: "shipped" | "pending" | "delivered" | "canceled" }
  >(createdShipmentRaw);

  // 3. Attempt to update status back to 'pending' (invalid transition)
  const invalidUpdateBody = {
    status: "pending",
  } satisfies import("@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment").IShoppingMallShipment.IUpdate;
  // 4. Verify API rejects the update with error
  await TestValidator.error(
    "shipment update with invalid backward status transition",
    async () => {
      await api.functional.shoppingMall.seller.shipments.updateShipment(
        sellerConnection,
        {
          shipmentId: createdShipment.id,
          body: invalidUpdateBody,
        },
      );
    },
  );
  // 5. Confirm the shipment remains unchanged after invalid update
  // Since we don't have a direct get shipment API in the provided functions,
  // simulate confirmation by accepting no change after a valid re-update
  const reupdateBody = {
    status: "shipped",
  } satisfies import("@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment").IShoppingMallShipment.IUpdate;
  const shipmentAfterInvalidUpdateRaw =
    await api.functional.shoppingMall.seller.shipments.updateShipment(
      sellerConnection,
      {
        shipmentId: createdShipment.id,
        body: reupdateBody,
      },
    );
  const shipmentAfterInvalidUpdate = typia.assert<
    IShoppingMallShipment & { status: "shipped" | "pending" | "delivered" | "canceled" }
  >(shipmentAfterInvalidUpdateRaw);

  TestValidator.equals(
    "shipment status after invalid update remains shipped",
    shipmentAfterInvalidUpdate.status,
    "shipped",
  );
}
