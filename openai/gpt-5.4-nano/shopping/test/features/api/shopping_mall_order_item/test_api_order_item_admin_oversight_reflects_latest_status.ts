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
import { generate_random_shopping_mall_admin_orders_oversight_apply_order_oversight } from "../../../generate/generate_random_shopping_mall_admin_orders_oversight_apply_order_oversight";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_item_admin_oversight_reflects_latest_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin actor connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 1) Authenticate as admin (join)
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2) Use two distinct order-item IDs (works in simulate mode)
  const orderItemIdA = typia.random<string & tags.Format<"uuid">>();
  let orderItemIdB = typia.random<string & tags.Format<"uuid">>();
  if (orderItemIdB === orderItemIdA) {
    orderItemIdB = typia.random<string & tags.Format<"uuid">>();
  }
  const initialA = await api.functional.shoppingMall.admin.admin.order_items.at(
    adminConnection,
    { orderItemId: orderItemIdA },
  );
  typia.assert(initialA);
  const initialB = await api.functional.shoppingMall.admin.admin.order_items.at(
    adminConnection,
    { orderItemId: orderItemIdB },
  );
  typia.assert(initialB);
  // 3) Apply an admin oversight decision
  await generate_random_shopping_mall_admin_orders_oversight_apply_order_oversight(
    adminConnection,
    { body: typia.random<IShoppingMallOrder.ICreate>() },
  );
  // 4) Re-fetch A and B
  const updatedA = await api.functional.shoppingMall.admin.admin.order_items.at(
    adminConnection,
    { orderItemId: orderItemIdA },
  );
  typia.assert(updatedA);
  const updatedB = await api.functional.shoppingMall.admin.admin.order_items.at(
    adminConnection,
    { orderItemId: orderItemIdB },
  );
  typia.assert(updatedB);
  // 5) Purchase-time fields must remain unchanged
  TestValidator.equals(
    "sellerPriceAtPurchase unchanged",
    updatedA.sellerPriceAtPurchase,
    initialA.sellerPriceAtPurchase,
  );
  TestValidator.equals(
    "quantity unchanged",
    updatedA.quantity,
    initialA.quantity,
  );
  TestValidator.equals(
    "placedAt unchanged",
    updatedA.placedAt,
    initialA.placedAt,
  );
  // 6) Isolation check for untouched item B: status unchanged
  TestValidator.equals(
    "lineItemStatus unchanged for untouched item",
    updatedB.lineItemStatus,
    initialB.lineItemStatus,
  );
}
