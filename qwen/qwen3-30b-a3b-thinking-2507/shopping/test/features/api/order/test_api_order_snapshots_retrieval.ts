import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer (authenticate)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Retrieve order snapshots
  const orderSnapshots =
    await api.functional.ecommerce.customer.orders.snapshots.index(
      userConnection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          search: "order",
          page: 1,
          limit: 10,
          sort: "created_at:desc",
        },
      },
    );
  typia.assert(orderSnapshots);
  // 3. Validate response structure
  TestValidator.predicate(
    "Order snapshots data should not be empty",
    orderSnapshots.data.length > 0,
  );
  // 4. Verify first snapshot contains expected fields
  if (orderSnapshots?.data?.length > 0) {
    const firstSnapshot = orderSnapshots.data[0];
    TestValidator.equals(
      "Snapshot should contain an ID",
      typeof firstSnapshot.id,
      "string",
    );
    TestValidator.predicate(
      "Snapshot should contain order information",
      !!firstSnapshot.order,
    );
    TestValidator.predicate(
      "Order status should be a string",
      typeof firstSnapshot.order.status === "string",
    );
  }
}
