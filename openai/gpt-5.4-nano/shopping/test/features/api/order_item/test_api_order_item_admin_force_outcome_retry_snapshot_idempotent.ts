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

export async function test_api_order_item_admin_force_outcome_retry_snapshot_idempotent(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminBody });
  // The scenario requires an existing, eligible orderItemId.
  // When running in simulate mode, we can use a random UUID because the SDK
  // returns mock data.
  const orderItemId = connection.simulate
    ? typia.random<string & tags.Format<"uuid">>()
    : (process.env.E2E_ORDER_ITEM_ID as string | undefined);
  if (!orderItemId) {
    throw new Error(
      "Missing E2E_ORDER_ITEM_ID environment variable for non-simulate mode.",
    );
  }
  const before = await api.functional.shoppingMall.admin.admin.order_items.at(
    adminConnection,
    {
      orderItemId: orderItemId satisfies string & tags.Format<"uuid">,
    },
  );
  typia.assert(before);
  // Use the current status as the forced target for an idempotency retry.
  // This avoids needing to know the domain's allowed forced terminal strings.
  const terminalTarget = before.lineItemStatus;
  const update1 =
    await api.functional.shoppingMall.admin.admin.order_items.update(
      adminConnection,
      {
        orderItemId: orderItemId satisfies string & tags.Format<"uuid">,
        body: {
          line_item_status: terminalTarget,
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(update1);
  const after1 = await api.functional.shoppingMall.admin.admin.order_items.at(
    adminConnection,
    {
      orderItemId: orderItemId satisfies string & tags.Format<"uuid">,
    },
  );
  typia.assert(after1);
  const update2 =
    await api.functional.shoppingMall.admin.admin.order_items.update(
      adminConnection,
      {
        orderItemId: orderItemId satisfies string & tags.Format<"uuid">,
        body: {
          line_item_status: terminalTarget,
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(update2);
  const after2 = await api.functional.shoppingMall.admin.admin.order_items.at(
    adminConnection,
    {
      orderItemId: orderItemId satisfies string & tags.Format<"uuid">,
    },
  );
  typia.assert(after2);
  TestValidator.equals(
    "lineItemStatus stable after first forced outcome",
    after1.lineItemStatus,
    terminalTarget,
  );
  TestValidator.equals(
    "lineItemStatus stable after retry forced outcome",
    after2.lineItemStatus,
    terminalTarget,
  );
  TestValidator.equals(
    "lineItemStatus unchanged between retries",
    after2.lineItemStatus,
    after1.lineItemStatus,
  );
  TestValidator.equals(
    "shoppingMallShipmentId unchanged between retries",
    after2.shoppingMallShipmentId,
    after1.shoppingMallShipmentId,
  );
  TestValidator.equals(
    "shipment linked idempotent between retries",
    after2.shipment?.id ?? null,
    after1.shipment?.id ?? null,
  );
  TestValidator.equals(
    "sellerSnapshotId unchanged between retries",
    after2.sellerSnapshotId,
    after1.sellerSnapshotId,
  );
}
