import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_admin_view_basic_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration for admin access
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Generate order item ID
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve order item details
  const orderItem =
    await api.functional.ecommerceMall.administrator.order_items.getByOrderitemid(
      adminConnection,
      { orderItemId },
    );
  typia.assert(orderItem);
  // 4. Validate order item structure
  TestValidator.equals("order item ID", orderItem.id, orderItemId);
  TestValidator.predicate(
    "order item has order",
    orderItem.order.id !== undefined,
  );
  TestValidator.predicate(
    "order item has product variant",
    orderItem.productVariant.id !== undefined,
  );
  TestValidator.predicate(
    "order item has seller",
    orderItem.seller.id !== undefined,
  );
  TestValidator.predicate("quantity >= 1", orderItem.quantity >= 1);
  TestValidator.predicate("unit_price > 0", orderItem.unit_price > 0);
  TestValidator.predicate("subtotal > 0", orderItem.subtotal > 0);
  // 5. Validate order details
  TestValidator.predicate(
    "order_number format",
    /^ORD-\d{8}-\d{5}$/.test(orderItem.order.order_number),
  );
  TestValidator.predicate(
    "order_status is string",
    typeof orderItem.order.status === "string",
  );
  TestValidator.predicate("total_price > 0", orderItem.order.total_price > 0);
  // 6. Validate product variant details
  TestValidator.predicate(
    "sku_code exists",
    orderItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "option_values is string",
    typeof orderItem.productVariant.option_values === "string",
  );
  TestValidator.predicate(
    "stock_quantity >= 0",
    orderItem.productVariant.stock_quantity >= 0,
  );
  // 7. Validate seller details
  TestValidator.predicate(
    "display_name exists",
    orderItem.seller.display_name.length > 0,
  );
  TestValidator.predicate(
    "approval_status is string",
    typeof orderItem.seller.approval_status === "string",
  );
  TestValidator.predicate(
    "is_suspended is boolean",
    typeof orderItem.seller.is_suspended === "boolean",
  );
  // 8. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(orderItem.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(orderItem.updated_at)),
  );
  TestValidator.predicate("deleted_at is NULL", orderItem.deleted_at === null);
  // 9. Validate status enum
  const validStatuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  TestValidator.predicate(
    "status is valid",
    validStatuses.includes(orderItem.status),
  );
}
