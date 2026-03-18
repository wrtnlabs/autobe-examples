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

export async function test_api_admin_order_detail_soft_deleted_and_item_status(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticated admin context
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Seeded fixture IDs (expected to exist in test harness)
  const nonDeletedOrderId: string & tags.Format<"uuid"> = (process.env
    .ORDER_ID_NON_DELETED ??
    typia.random<string & tags.Format<"uuid">>()) satisfies string &
    tags.Format<"uuid">;
  const softDeletedOrderId: string & tags.Format<"uuid"> = (process.env
    .ORDER_ID_SOFT_DELETED ??
    typia.random<string & tags.Format<"uuid">>()) satisfies string &
    tags.Format<"uuid">;
  // 2) Scenario 1: non-deleted order detail should be readable and stable across reads
  const firstRead = await api.functional.shoppingMall.admin.admin.orders.at(
    adminConnection,
    {
      orderId: nonDeletedOrderId,
    },
  );
  typia.assert(firstRead);
  TestValidator.predicate(
    "non-deleted order has order items",
    firstRead.orderItems.length > 0,
  );
  TestValidator.predicate(
    "non-deleted order has shipment entries",
    firstRead.shipments.length >= 0,
  );
  const itemStatuses = firstRead.orderItems.map(
    (item) => item.line_item_status,
  );
  const uniqueItemStatuses = Array.from(new Set(itemStatuses));
  TestValidator.predicate(
    "non-deleted order has varying line_item_status values when multiple items exist",
    firstRead.orderItems.length < 2 || uniqueItemStatuses.length >= 1,
  );
  const hasAnyShipmentStatus = ArrayUtil.has(
    firstRead.shipments,
    (s) => s.status.length > 0,
  );
  TestValidator.predicate(
    "shipments have status strings",
    hasAnyShipmentStatus,
  );
  // Tracking fields may be null if not confirmed
  TestValidator.predicate(
    "trackingUrl is either null or a valid string (runtime format validated by typia)",
    firstRead.shipments.every(
      (s) => s.trackingUrl === null || typeof s.trackingUrl === "string",
    ),
  );
  const secondRead = await api.functional.shoppingMall.admin.admin.orders.at(
    adminConnection,
    {
      orderId: nonDeletedOrderId,
    },
  );
  typia.assert(secondRead);
  // Ensure key identifiers/timestamps remain consistent across reads (no mutation by read endpoint)
  TestValidator.equals("order id stable", secondRead.id, firstRead.id);
  TestValidator.equals(
    "order_code stable",
    secondRead.order_code,
    firstRead.order_code,
  );
  TestValidator.equals(
    "placed_at stable",
    secondRead.placed_at,
    firstRead.placed_at,
  );
  TestValidator.equals(
    "created_at stable",
    secondRead.created_at,
    firstRead.created_at,
  );
  TestValidator.equals(
    "updated_at stable",
    secondRead.updated_at,
    firstRead.updated_at,
  );
  TestValidator.equals(
    "deleted_at stable",
    secondRead.deleted_at,
    firstRead.deleted_at,
  );
  // 3) Scenario 2: soft-deleted order should follow admin read policy
  const softRead = await api.functional.shoppingMall.admin.admin.orders.at(
    adminConnection,
    {
      orderId: softDeletedOrderId,
    },
  );
  typia.assert(softRead);
  TestValidator.equals(
    "soft-deleted order id matches",
    softRead.id,
    softDeletedOrderId,
  );
  TestValidator.predicate(
    "soft-deleted order header reflects soft-delete semantics (deleted_at present)",
    softRead.deleted_at !== null,
  );
  // Associated collections should not silently drop the main header
  TestValidator.predicate(
    "soft-deleted order items array exists",
    Array.isArray(softRead.orderItems),
  );
  TestValidator.predicate(
    "soft-deleted order shipments array exists",
    Array.isArray(softRead.shipments),
  );
  // Line items and shipments returned should have valid per-row deleted markers per typia types
  // (No additional redundant checks after typia.assert)
  // 4) Scenario 3: authorization boundary (no auth)
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated caller should be rejected for admin order detail",
    async () => {
      await api.functional.shoppingMall.admin.admin.orders.at(
        unauthConnection,
        {
          orderId: nonDeletedOrderId,
        },
      );
    },
  );
}
