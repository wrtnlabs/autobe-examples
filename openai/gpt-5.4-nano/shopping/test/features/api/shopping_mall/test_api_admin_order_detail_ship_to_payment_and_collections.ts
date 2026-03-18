import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_detail_ship_to_payment_and_collections(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication (use admin join utility)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: adminJoin,
    },
  );
  typia.assert(adminAuth);
  // 2) Try to retrieve an existing order with limited retries.
  let lastError: unknown = undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderId: string & tags.Format<"uuid"> = typia.random<
      string & tags.Format<"uuid">
    >();
    try {
      const order: IShoppingMallOrder =
        await api.functional.shoppingMall.admin.admin.orders.at(
          adminConnection,
          {
            orderId,
          },
        );
      typia.assert(order);
      // Ship-to fields should be populated and non-empty
      TestValidator.predicate(
        "ship_to_name is non-empty",
        order.ship_to_name.trim().length > 0,
      );
      TestValidator.predicate(
        "ship_to_phone is non-empty",
        order.ship_to_phone.trim().length > 0,
      );
      TestValidator.predicate(
        "ship_to_postal_code is non-empty",
        order.ship_to_postal_code.trim().length > 0,
      );
      TestValidator.predicate(
        "ship_to_region is non-empty",
        order.ship_to_region.trim().length > 0,
      );
      TestValidator.predicate(
        "ship_to_city is non-empty",
        order.ship_to_city.trim().length > 0,
      );
      TestValidator.predicate(
        "ship_to_street_address is non-empty",
        order.ship_to_street_address.trim().length > 0,
      );
      TestValidator.predicate(
        "ship_to_detail_address is non-empty",
        order.ship_to_detail_address.trim().length > 0,
      );
      // Active order should not be soft-deleted
      TestValidator.equals("deleted_at is null", order.deleted_at, null);
      // Arrays must exist
      TestValidator.predicate(
        "orderItems is array",
        Array.isArray(order.orderItems),
      );
      TestValidator.predicate(
        "shipments is array",
        Array.isArray(order.shipments),
      );
      // Nullable tracking fields are allowed to be null; rely on typia.assert for shape.
      for (const shipment of order.shipments) {
        typia.assert(shipment);
        TestValidator.predicate(
          "tracking fields are either null or non-empty strings when present",
          shipment.trackingUrl === null || shipment.trackingUrl.length > 0,
        );
        TestValidator.predicate(
          "trackingNumber is null or non-empty when present",
          shipment.trackingNumber === null ||
            shipment.trackingNumber.trim().length > 0,
        );
        TestValidator.predicate(
          "carrierName is null or non-empty when present",
          shipment.carrierName === null ||
            shipment.carrierName.trim().length > 0,
        );
      }
      // Customer and payment sections are validated by typia.assert(order)
      TestValidator.predicate(
        "payment amount is non-negative",
        order.payment.amount >= 0,
      );
      return;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to retrieve an admin-accessible order");
}
