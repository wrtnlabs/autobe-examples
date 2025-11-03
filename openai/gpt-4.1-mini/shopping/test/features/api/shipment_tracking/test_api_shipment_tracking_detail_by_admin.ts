import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";

export async function test_api_shipment_tracking_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongP@ssword123",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Generate valid shipment tracking ID (UUID)
  const shipmentTrackingId = typia.random<string & tags.Format<"uuid">>();

  // 3. Fetch shipment tracking details
  const shipmentTracking: IShoppingMallShipmentTracking =
    await api.functional.shoppingMall.admin.shipmentTrackings.at(connection, {
      id: shipmentTrackingId,
    });
  typia.assert(shipmentTracking);

  // 4. Validate returned data
  TestValidator.equals(
    "shipment tracking ID matches requested ID",
    shipmentTracking.id,
    shipmentTrackingId,
  );

  TestValidator.predicate(
    "shipping status is a non-empty string",
    typeof shipmentTracking.shipping_status === "string" &&
      shipmentTracking.shipping_status.length > 0,
  );

  TestValidator.predicate(
    "carrier name is a non-empty string",
    typeof shipmentTracking.carrier_name === "string" &&
      shipmentTracking.carrier_name.length > 0,
  );

  TestValidator.predicate(
    "tracking number is a non-empty string",
    typeof shipmentTracking.tracking_number === "string" &&
      shipmentTracking.tracking_number.length > 0,
  );

  TestValidator.predicate(
    "shipped_at is a valid ISO date string",
    typeof shipmentTracking.shipped_at === "string" &&
      !isNaN(Date.parse(shipmentTracking.shipped_at)),
  );

  TestValidator.predicate(
    "shopping_mall_order_id is a valid UUID string",
    typeof shipmentTracking.shopping_mall_order_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        shipmentTracking.shopping_mall_order_id,
      ),
  );

  // 5. Check nullable fields delivered_at and deleted_at
  if (
    shipmentTracking.delivered_at !== null &&
    shipmentTracking.delivered_at !== undefined
  ) {
    TestValidator.predicate(
      "delivered_at is a valid ISO date string",
      typeof shipmentTracking.delivered_at === "string" &&
        !isNaN(Date.parse(shipmentTracking.delivered_at)),
    );
  }

  if (
    shipmentTracking.deleted_at !== null &&
    shipmentTracking.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is a valid ISO date string",
      typeof shipmentTracking.deleted_at === "string" &&
        !isNaN(Date.parse(shipmentTracking.deleted_at)),
    );
  }
}
