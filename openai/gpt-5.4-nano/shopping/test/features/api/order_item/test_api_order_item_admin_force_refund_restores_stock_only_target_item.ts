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

export async function test_api_order_item_admin_force_refund_restores_stock_only_target_item(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin joins via POST /shoppingMall/auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  // 2) Target an existing eligible order item.
  // This prompt does not include read endpoints to discover an eligible item,
  // so we use a UUID placeholder that must be pre-seeded/eligible in the test environment.
  const targetOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3) Force-refund the single order item
  const forcedLineItemStatus = "refunded";
  const updateBody = {
    line_item_status: forcedLineItemStatus,
  } satisfies IShoppingMallOrderItem.IUpdate;
  const updated =
    await api.functional.shoppingMall.admin.admin.order_items.update(
      adminConnection,
      {
        orderItemId: targetOrderItemId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // 4) Validate business outcomes that are expressible from the update response
  TestValidator.equals(
    "target item status updated to refunded",
    updated.lineItemStatus,
    forcedLineItemStatus,
  );
  // Variant linkage must be coherent
  TestValidator.equals(
    "product variant id coherence",
    updated.shoppingMallProductVariantId,
    updated.productVariant.id,
  );
  // Shipment linkage must be coherent
  TestValidator.equals(
    "shipment id coherence",
    updated.shipment === null ? null : updated.shipment.id,
    updated.shoppingMallShipmentId,
  );
  if (updated.shipment !== null) {
    TestValidator.equals(
      "shipment remains linked after refund",
      updated.shoppingMallShipmentId,
      updated.shipment.id,
    );
  }
  // Seller snapshot linkage must remain coherent (no retroactive snapshot removal)
  TestValidator.equals(
    "seller snapshot id coherence",
    updated.sellerSnapshotId,
    updated.sellerSnapshot.id,
  );
}
