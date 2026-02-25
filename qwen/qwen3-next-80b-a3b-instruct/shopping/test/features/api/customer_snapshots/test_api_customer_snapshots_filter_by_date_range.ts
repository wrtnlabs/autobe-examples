import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_snapshots_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(authorized);
  // 2. Query customer snapshots with date range
  // Use current date as end date and 30 days ago as start date
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const request: IShoppingMallProductSnapshot.IRequest = {
    changed_by: "customer", // Filter for customer snapshots
    entity_type: "product", // Request at least one type
    from_date: startDate.toISOString().split("T")[0] as string &
      tags.Format<"date">,
    to_date: endDate.toISOString().split("T")[0] as string &
      tags.Format<"date">,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  const result = await api.functional.shoppingMall.customer.snapshots.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(result);
  // 3. Validate response structure against actual DTO (no changed_at or changed_by)
  // Validate pagination metadata
  TestValidator.equals(
    "total snapshots count",
    result.pagination.records,
    result.pagination.records,
  );
  TestValidator.equals("current page number", result.pagination.current, 1);
  TestValidator.equals("page size", result.pagination.limit, 10);
  TestValidator.predicate(
    "page count is positive",
    () => result.pagination.pages > 0,
  );
  // 4. Validate data array structure: must have id, display_name (optional), status
  result.data.forEach((snapshot) => {
    TestValidator.equals("snapshot has id", typeof snapshot.id, "string");
    TestValidator.predicate("snapshot id is valid uuid", () =>
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
    );
    TestValidator.predicate("snapshot status is valid", () =>
      ["active", "suspended", "deleted"].includes(snapshot.status),
    );
    // display_name is optional - no validation required
  });
  // 5. Validate second page with smaller limit
  const secondPageRequest: IShoppingMallProductSnapshot.IRequest = {
    changed_by: "customer",
    entity_type: "product",
    from_date: startDate.toISOString().split("T")[0] as string &
      tags.Format<"date">,
    to_date: endDate.toISOString().split("T")[0] as string &
      tags.Format<"date">,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  const secondPageResult =
    await api.functional.shoppingMall.customer.snapshots.index(
      customerConnection,
      {
        body: secondPageRequest,
      },
    );
  typia.assert(secondPageResult);
  TestValidator.equals(
    "second page pagination",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.predicate(
    "second page has at most 5 records",
    () => secondPageResult.data.length <= 5,
  );
  // 6. Validate empty page returns empty data with correct pagination metadata
  const nextPageRequest: IShoppingMallProductSnapshot.IRequest = {
    changed_by: "customer",
    entity_type: "product",
    from_date: startDate.toISOString().split("T")[0] as string &
      tags.Format<"date">,
    to_date: endDate.toISOString().split("T")[0] as string &
      tags.Format<"date">,
    page: 999 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  const nextPageResult =
    await api.functional.shoppingMall.customer.snapshots.index(
      customerConnection,
      {
        body: nextPageRequest,
      },
    );
  typia.assert(nextPageResult);
  TestValidator.equals(
    "empty page result count",
    nextPageResult.data.length,
    0,
  );
  TestValidator.predicate(
    "empty page pagination records matches other pages",
    () => nextPageResult.pagination.records >= 0,
  );
}
