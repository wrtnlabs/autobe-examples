import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminActionLog";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderOverride";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_override_audit_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Admin registration and login (regular privileges)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthorized);
  // Regular customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinInput = {
    email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuthorized);
  // Customer creates an order
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // Admin force-cancels the order item (creates override audit record)
  const updatedOrder = await api.functional.ecommerceMall.admin.orders.update(
    adminConnection,
    {
      orderId: order.id,
      body: {
        order_items: order.order_items.map((item) => ({
          id: item.id,
          quantity: null,
        })),
      } satisfies IEcommerceMallOrder.IUpdate,
    },
  );
  typia.assert(updatedOrder);
  // Verify order item status was changed to cancelled
  TestValidator.equals(
    "order item status changed to cancelled",
    updatedOrder.order_items[0].item_status,
    "cancelled",
  );
  // Retrieve the order override audit record
  const orderOverrideId = updatedOrder.order_items[0].id;
  const orderOverride =
    await api.functional.ecommerceMall.admin.order_overrides.at(
      adminConnection,
      {
        orderOverrideId,
      },
    );
  typia.assert(orderOverride);
  // Validate order override details
  TestValidator.equals(
    "admin matches",
    orderOverride.adminUser.id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "customer matches",
    orderOverride.customer.id,
    customerAuthorized.customer.id,
  );
  TestValidator.equals("order matches", orderOverride.order.id, order.id);
  TestValidator.equals(
    "order item matches",
    orderOverride.orderItem.id,
    updatedOrder.order_items[0].id,
  );
  TestValidator.equals(
    "action type is cancel",
    orderOverride.action_type,
    "cancel",
  );
  TestValidator.predicate("reason provided", orderOverride.reason.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    orderOverride.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    orderOverride.updated_at !== undefined,
  );
}
