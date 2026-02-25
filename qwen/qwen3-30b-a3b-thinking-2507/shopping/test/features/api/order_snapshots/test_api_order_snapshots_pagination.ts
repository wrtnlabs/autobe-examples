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

export async function test_api_order_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/signup",
      referrer: "https://example.com/product/123",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const orderSnapshotResponse =
    await api.functional.ecommerce.customer.orders.snapshots.index(
      customerConnection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 2,
          limit: 15,
        } satisfies IEcommerceOrderSnapshot.IRequest,
      },
    );
  typia.assert(orderSnapshotResponse);
  TestValidator.equals(
    "current page",
    orderSnapshotResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit per page",
    orderSnapshotResponse.pagination.limit,
    15,
  );
  TestValidator.predicate(
    "total records > 0",
    orderSnapshotResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages ≥ 2",
    orderSnapshotResponse.pagination.pages >= 2,
  );
}
