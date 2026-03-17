import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Create a test order ID (using generated UUID)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve snapshots for the order
  const result: IPageIEcommerceMallSnapshot.ISummary =
    await api.functional.ecommerceMall.customer.orders.snapshots.index(
      customerConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination pages calculation",
    result.pagination.pages,
    result.pagination.records > 0
      ? Math.ceil(result.pagination.records / result.pagination.limit)
      : 0,
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 6. If snapshots exist, validate ordering by created_at DESC
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      const previousTime = new Date(result.data[i - 1].created_at).getTime();
      const currentTime = new Date(result.data[i].created_at).getTime();
      TestValidator.predicate(
        `snapshot ordering ${i - 1} to ${i} is DESC`,
        previousTime >= currentTime,
      );
    }
  }
  // 7. Test custom pagination parameters
  const customResult: IPageIEcommerceMallSnapshot.ISummary =
    await api.functional.ecommerceMall.customer.orders.snapshots.index(
      customerConnection,
      {
        orderId,
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(customResult);
  TestValidator.equals(
    "custom pagination current",
    customResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom pagination limit",
    customResult.pagination.limit,
    10,
  );
}
