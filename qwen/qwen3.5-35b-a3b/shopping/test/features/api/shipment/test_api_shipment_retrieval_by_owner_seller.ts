import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_retrieval_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and get authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(sellerAuthorized);
  // Create new connection with seller token for subsequent API calls
  const sellerTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuthorized.token.access },
  };
  // 2. Create a shipment for the seller
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerTokenConnection,
    {
      body: typia.random<IEcommerceMallShipment.ICreate>(),
    },
  );
  typia.assert(shipment);
  // 3. Retrieve the shipment by ID
  const retrievedShipment =
    await api.functional.ecommerceMall.seller.shipments.at(
      sellerTokenConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(retrievedShipment);
  // 4. Validate shipment retrieval
  TestValidator.equals(
    "shipment ID matches",
    retrievedShipment.id,
    shipment.id,
  );
  // Validate carrier fields
  TestValidator.equals(
    "carrier name matches",
    retrievedShipment.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "carrier phone matches",
    retrievedShipment.carrierPhone,
    shipment.carrierPhone,
  );
  TestValidator.equals(
    "carrier website matches",
    retrievedShipment.carrierWebsite,
    shipment.carrierWebsite,
  );
  // Validate status is pending (initial status)
  TestValidator.equals(
    "shipment status is pending",
    retrievedShipment.status,
    "pending",
  );
  // Validate temporal fields are null for newly created shipment
  TestValidator.equals("shipped_at is null", retrievedShipment.shippedAt, null);
  TestValidator.equals(
    "delivered_at is null",
    retrievedShipment.deliveredAt,
    null,
  );
  TestValidator.equals(
    "estimated_delivery_at is null",
    retrievedShipment.estimatedDeliveryAt,
    null,
  );
  // Validate order reference exists and matches
  TestValidator.equals(
    "order ID matches",
    retrievedShipment.order.id,
    shipment.order.id,
  );
  // Validate seller reference matches authenticated seller
  TestValidator.equals(
    "seller ID matches",
    retrievedShipment.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedShipment.seller.email,
    sellerAuthorized.email,
  );
  // Validate delivery address matches
  TestValidator.equals(
    "delivery address matches",
    retrievedShipment.deliveryAddress,
    shipment.deliveryAddress,
  );
  // Validate created_at is reasonable (close to current time, within 1 minute)
  const oneMinute = 60 * 1000;
  const createdAt = new Date(retrievedShipment.createdAt).getTime();
  const currentTime = new Date().getTime();
  TestValidator.predicate(
    "created_at is close to current time",
    Math.abs(currentTime - createdAt) < oneMinute,
  );
  // Validate deleted_at is null (soft delete protection)
  TestValidator.equals(
    "soft delete protection",
    retrievedShipment.deletedAt,
    null,
  );
}
