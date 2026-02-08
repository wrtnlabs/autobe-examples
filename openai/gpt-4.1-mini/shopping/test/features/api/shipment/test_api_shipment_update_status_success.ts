import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function test_api_shipment_update_status_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };

  // Scenario 1: Successful update of shipment status
  // Create shipment with initial status 'pending'
  const shipmentPending =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      { body: { status: "pending" } },
    );
  typia.assert(shipmentPending);

  // Wait a minimal time to ensure timestamp difference
  await new Promise((r) => setTimeout(r, 10));

  // Update shipment status to 'shipped'
  const shipmentUpdated =
    await api.functional.shoppingMall.seller.shipments.updateShipment(
      sellerConnection,
      {
        shipmentId: (shipmentPending as any).id,
        body: { status: "shipped" },
      },
    );
  typia.assert(shipmentUpdated);

  // Scenario 2: Invalid status transition
  // Create shipment with status 'shipped'
  const shipmentShipped =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      { body: { status: "shipped" } },
    );
  typia.assert(shipmentShipped);

  // Attempt to update status from 'shipped' to 'pending' (backward, invalid)
  await TestValidator.error("invalid backward status transition", async () => {
    await api.functional.shoppingMall.seller.shipments.updateShipment(
      sellerConnection,
      {
        shipmentId: (shipmentShipped as any).id,
        body: { status: "pending" },
      },
    );
  });

  // Scenario 3: Soft delete shipment
  // Create shipment with initial status 'pending'
  const shipmentToDelete =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      { body: { status: "pending" } },
    );
  typia.assert(shipmentToDelete);

  // Use current ISO string as deleted_at value
  const deletedAt = new Date().toISOString();

  const softDeletedShipment =
    await api.functional.shoppingMall.seller.shipments.updateShipment(
      sellerConnection,
      {
        shipmentId: (shipmentToDelete as any).id,
        body: { deleted_at: deletedAt },
      },
    );
  typia.assert(softDeletedShipment);
}
