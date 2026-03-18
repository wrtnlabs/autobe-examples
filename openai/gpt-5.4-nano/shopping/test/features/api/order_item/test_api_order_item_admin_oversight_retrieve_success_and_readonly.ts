import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_order_item_admin_oversight_retrieve_success_and_readonly(
  connection: api.IConnection,
): Promise<void> {
  // The test harness is expected to supply these IDs.
  // They are generated here only as placeholders; in real suite runs
  // the harness should overwrite/provide deterministic values.
  const existingOrderItemId: string & tags.Format<"uuid"> =
    (
      globalThis as unknown as {
        __existingOrderItemId?: string & tags.Format<"uuid">;
        __nonExistingOrderItemId?: string & tags.Format<"uuid">;
      }
    ).__existingOrderItemId ?? typia.random<string & tags.Format<"uuid">>();
  const nonExistingOrderItemId: string & tags.Format<"uuid"> =
    (
      globalThis as unknown as {
        __existingOrderItemId?: string & tags.Format<"uuid">;
        __nonExistingOrderItemId?: string & tags.Format<"uuid">;
      }
    ).__nonExistingOrderItemId ?? typia.random<string & tags.Format<"uuid">>();
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<IShoppingMallAdmin.ILogin>(),
  });
  const first: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.admin.order_items.at(
      adminConnection,
      { orderItemId: existingOrderItemId },
    );
  typia.assert(first);
  // Shipment linkage behavior
  if (first.shoppingMallShipmentId === null) {
    TestValidator.equals(
      "shipment null when shoppingMallShipmentId is null",
      first.shipment,
      null,
    );
  } else {
    typia.assert(first.shipment!);
    TestValidator.equals(
      "shipment id matches shoppingMallShipmentId",
      first.shipment!.id,
      first.shoppingMallShipmentId,
    );
  }
  const second: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.admin.order_items.at(
      adminConnection,
      { orderItemId: existingOrderItemId },
    );
  typia.assert(second);
  // Read-only guarantee: stable authoritative state and linkage fields
  TestValidator.equals("id stable", second.id, first.id);
  TestValidator.equals(
    "lineItemStatus stable",
    second.lineItemStatus,
    first.lineItemStatus,
  );
  TestValidator.equals(
    "shoppingMallOrderId stable",
    second.shoppingMallOrderId,
    first.shoppingMallOrderId,
  );
  TestValidator.equals(
    "shoppingMallProductVariantId stable",
    second.shoppingMallProductVariantId,
    first.shoppingMallProductVariantId,
  );
  TestValidator.equals(
    "sellerSnapshotId stable",
    second.sellerSnapshotId,
    first.sellerSnapshotId,
  );
  TestValidator.equals(
    "shoppingMallShipmentId stable",
    second.shoppingMallShipmentId,
    first.shoppingMallShipmentId,
  );
  TestValidator.equals("placedAt stable", second.placedAt, first.placedAt);
  TestValidator.equals("createdAt stable", second.createdAt, first.createdAt);
  TestValidator.equals("updatedAt stable", second.updatedAt, first.updatedAt);
  if (second.shoppingMallShipmentId === null) {
    TestValidator.equals(
      "shipment null when shoppingMallShipmentId is null (2nd fetch)",
      second.shipment,
      null,
    );
  } else {
    typia.assert(second.shipment!);
    TestValidator.equals(
      "shipment id matches shoppingMallShipmentId (2nd fetch)",
      second.shipment!.id,
      second.shoppingMallShipmentId,
    );
  }
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IShoppingMallMember.IJoin>(),
  });
  await TestValidator.error(
    "member cannot access admin order item oversight",
    async () => {
      await api.functional.shoppingMall.admin.admin.order_items.at(
        memberConnection,
        { orderItemId: existingOrderItemId },
      );
    },
  );
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection2, {
    body: typia.random<IShoppingMallAdmin.ILogin>(),
  });
  await TestValidator.httpError(
    "non-existing order item returns not-found",
    [404],
    async () => {
      await api.functional.shoppingMall.admin.admin.order_items.at(
        adminConnection2,
        { orderItemId: nonExistingOrderItemId },
      );
    },
  );
}
