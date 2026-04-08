import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_shipments_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_order_item_admin_force_cancel(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super admin to create test data
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // Step 2: Create a shipment to generate order items
  await generate_random_ecommerce_mall_super_admin_shipments_create(
    superAdminConnection,
    {},
  );
  // Step 3: Authenticate as admin to perform force-cancel operation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 4: Retrieve order items to find a cancellable one in 'paid' status
  const orderItemsPage = await api.functional.ecommerceMall.admin.items.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(orderItemsPage);
  // Find an item in 'paid' status that can be cancelled
  const cancellableItem = orderItemsPage.data.find(
    (item) => item.status === "paid",
  );
  if (!cancellableItem) {
    throw new Error("No cancellable order item found in 'paid' status");
  }
  // Step 5: Force-cancel the order item by updating status to 'cancelled'
  const updatedItem = await api.functional.ecommerceMall.admin.items.update(
    adminConnection,
    {
      itemId: cancellableItem.id,
      body: {
        status: "cancelled",
      } satisfies IEcommerceMallOrderItem.IUpdate,
    },
  );
  typia.assert(updatedItem);
  // Step 6: Validate the force-cancel was successful
  TestValidator.equals(
    "status changed to cancelled",
    updatedItem.status,
    "cancelled",
  );
  TestValidator.equals(
    "item ID preserved after update",
    updatedItem.id,
    cancellableItem.id,
  );
}
