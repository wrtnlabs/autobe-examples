import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_unit_snapshots_index_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join to get authorized connection
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerJoinConnection, {
    body: {},
  });
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Test unauthorized access with base connection
  await TestValidator.error(
    "unauthorized access with base connection",
    async () => {
      await api.functional.shoppingMall.customer.sale_unit_snapshots.index(
        connection,
        {
          body: {},
        },
      );
    },
  );
  // 3. Make authorized request to retrieve sale unit snapshots (no filter due to empty request schema)
  const output: IPageIShoppingMallSaleUnitSnapshot.ISummary =
    await api.functional.shoppingMall.customer.sale_unit_snapshots.index(
      customerConnection,
      {
        body: {},
      },
    );
  // 4. Validate output structure
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // 5. Validate each snapshot
  for (const snapshot of output.data) {
    typia.assert(snapshot);
  }
}
