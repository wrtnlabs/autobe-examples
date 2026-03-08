import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Retrieve order list with default pagination (no filters)
  const orderList =
    await api.functional.ecommerceMall.admin.customers.orders.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(orderList);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    orderList.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current is non-negative",
    orderList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    orderList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    orderList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    orderList.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate("data array exists", Array.isArray(orderList.data));
  // 5. If orders exist, validate order summary structure
  if (orderList.data.length > 0) {
    const firstOrder = orderList.data[0];
    typia.assert(firstOrder);
    // Validate order summary fields
    TestValidator.predicate("order has id", firstOrder.id !== undefined);
    TestValidator.predicate(
      "order has orderNumber",
      firstOrder.orderNumber !== undefined,
    );
    TestValidator.predicate(
      "order has status",
      firstOrder.status !== undefined,
    );
    TestValidator.predicate(
      "order has totalPrice",
      typeof firstOrder.totalPrice === "number",
    );
    TestValidator.predicate(
      "order has createdAt",
      firstOrder.createdAt !== undefined,
    );
    TestValidator.predicate(
      "order has itemCount",
      typeof firstOrder.itemCount === "number",
    );
    // Validate customer information
    TestValidator.predicate(
      "order has customer",
      firstOrder.customer !== undefined,
    );
    TestValidator.predicate(
      "customer has id",
      firstOrder.customer.id !== undefined,
    );
    TestValidator.predicate(
      "customer has email",
      firstOrder.customer.email !== undefined,
    );
    TestValidator.predicate(
      "customer has account_status",
      firstOrder.customer.account_status !== undefined,
    );
  }
}