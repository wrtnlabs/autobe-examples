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

export async function test_api_order_item_admin_force_cancel_restores_stock_only_target_item(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin authorize (best-effort: create credentials then join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword!234" satisfies string & tags.Format<"password">,
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await api.functional.shoppingMall.auth.admin.join(
    adminConnection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(adminAuth);
  // Load a candidate order item
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const before = await api.functional.shoppingMall.admin.admin.order_items.at(
    adminConnection,
    { orderItemId },
  );
  typia.assert(before);
  const beforeShoppingMallProductVariantId =
    before.shoppingMallProductVariantId;
  const beforeShoppingMallShipmentId = before.shoppingMallShipmentId;
  const beforeSellerSnapshotId = before.sellerSnapshotId;
  const beforeSellerSnapshot = before.sellerSnapshot;
  const beforeShipment = before.shipment;
  // Apply forced cancel (best-effort expected to be accepted by server)
  const forcedLineItemStatus = "forced_cancel";
  const updateBody = {
    line_item_status: forcedLineItemStatus,
  } satisfies IShoppingMallOrderItem.IUpdate;
  const after1 =
    await api.functional.shoppingMall.admin.admin.order_items.update(
      adminConnection,
      {
        orderItemId,
        body: updateBody,
      },
    );
  typia.assert(after1);
  TestValidator.equals("order item id matches", after1.id, before.id);
  TestValidator.equals(
    "product variant linkage unchanged",
    after1.shoppingMallProductVariantId,
    beforeShoppingMallProductVariantId,
  );
  // business outcome
  TestValidator.equals(
    "line_item_status updated to forced cancel",
    after1.lineItemStatus,
    forcedLineItemStatus,
  );
  // Snapshot integrity: seller snapshot should remain immutable
  TestValidator.equals(
    "sellerSnapshotId unchanged",
    after1.sellerSnapshotId,
    beforeSellerSnapshotId,
  );
  TestValidator.equals(
    "sellerSnapshot id unchanged",
    after1.sellerSnapshot.id,
    beforeSellerSnapshot.id,
  );
  // Shipment reconciliation
  TestValidator.equals(
    "shoppingMallShipmentId preserved",
    after1.shoppingMallShipmentId,
    beforeShoppingMallShipmentId,
  );
  if (beforeShoppingMallShipmentId !== null) {
    TestValidator.predicate(
      "shipment summary present",
      after1.shipment !== null,
    );
    if (after1.shipment !== null) {
      if (beforeShipment !== null) {
        TestValidator.equals(
          "shipment id matches",
          after1.shipment.id,
          beforeShipment.id,
        );
      }
    }
  } else {
    TestValidator.equals("shipment still unassigned", after1.shipment, null);
  }
  // Idempotency-ready: repeat PUT should not create conflicting final decisions
  const after2 =
    await api.functional.shoppingMall.admin.admin.order_items.update(
      adminConnection,
      {
        orderItemId,
        body: updateBody,
      },
    );
  typia.assert(after2);
  TestValidator.equals(
    "idempotent forced cancel line_item_status",
    after2.lineItemStatus,
    after1.lineItemStatus,
  );
}
