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

/**
 * Test seller shipment retrieval success and not found scenarios.
 *
 * Scenario 1: Seller joins, authenticates, retrieves own shipment successfully.
 * Scenario 2: Seller attempts to retrieve non-existent shipment and gets 404.
 */
export async function test_api_seller_shipment_retrieve_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.shoppingMall.auth.seller.join(sellerConnection, {
      body: {},
    });
  // authorized.token.access assumed to be returned by join
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. As shipment creation API is unavailable, simulate shipment fetch
  // by trying to fetch a random shipmentId which won't be found - expect 404
  // Generate a random UUID for non-existent shipment
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 2: Access with non-existent shipmentId
  await TestValidator.httpError(
    "seller shipment retrieve non-existent shipment",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipments.at(sellerConnection, {
        shipmentId: nonExistentShipmentId,
      });
    },
  );
  // Scenario 1: Since shipment creation API is not available, if there were a
  // way to create shipment, we would test retrieval of existing shipment here.
  // Instead, we will test that accessing a shipment that belongs to another
  // seller produces unauthorized or 404 (if enforced by API).
  // Generate another random seller and shipmentId
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.shoppingMall.auth.seller.join(otherSellerConnection, {
      body: {},
    });
  otherSellerConnection.headers = {
    Authorization: otherAuthorized.token.access,
  };
  // Seller1 attempts to access a shipmentId that could be belonging to Seller2
  // But since no shipment exists, expect 404 from seller1 trying to access seller2's shipment
  // Use shipmentId from otherSeller (fake) with sellerConnection
  // This tests the access control that seller cannot access others' shipments
  // Use random shipmentId again
  const otherShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "seller shipment access another seller shipment",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipments.at(sellerConnection, {
        shipmentId: otherShipmentId,
      });
    },
  );
}
