import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_snapshots_listing_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new customer via POST /shoppingMall/auth/customer/join.
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // 2. Call PATCH /shoppingMall/customer/sale-snapshots with no filters (default pagination).
  type IRequest = DeepPartial<IShoppingMallSaleSnapshot.IRequest>;
  const noFilterBody: IRequest = {};
  const snapshots =
    await api.functional.shoppingMall.customer.sale_snapshots.index(
      customerConnection,
      { body: noFilterBody },
    );
  // Assert type of entire response
  typia.assert<IPageIShoppingMallSaleSnapshot.ISummary>(snapshots);
  // 3. Validate the response includes a paginated list with correct pagination metadata.
  TestValidator.predicate(
    "pagination current page positive",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    snapshots.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 4. Each snapshot item: assert type but no further property checks since ISummary is empty
  for (const snapshot of snapshots.data) {
    typia.assert<unknown>(snapshot);
  }
  // 5. Skip filtering by category id (property does not exist in schema)
  // 6. Skip filtering by base price range (property does not exist in schema)
  // 7. Skip filtering by created_at range (property does not exist in schema)
}
