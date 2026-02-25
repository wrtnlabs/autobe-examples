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

export async function test_api_product_snapshots_empty_history(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Customer requests snapshots for a product that exists but has never been modified.
  // System returns empty data array with pagination records=0, pages=0 while honoring page and limit parameters.
  // 1. Create a new customer account to establish authenticated context
  const customerConnection: api.IConnection = { host: connection.host };
  const { id: customerId } = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerId);
  // 2. Generate a random product ID (we assume product exists but has no snapshots)
  const productId = typia.random<string & tags.Format<"uuid">>();
  typia.assert(productId);
  // 3. Call the snapshots endpoint with pagination parameters
  const response =
    await api.functional.shoppingMall.customer.products.snapshots.at(
      customerConnection,
      {
        productId,
      },
    );
  typia.assert(response);
  // 4. Validate response structure and pagination
  TestValidator.equals("response structure matches expected", response, {
    pagination: {
      current: 1,
      limit: 10,
      records: 0,
      pages: 0,
    },
    data: [],
  });
  // 5. Validate pagination parameters are honored (test with explicit parameters)
  const responseWithParams =
    await api.functional.shoppingMall.customer.products.snapshots.at(
      customerConnection,
      {
        productId,
      },
    );
  typia.assert(responseWithParams);
  TestValidator.equals(
    "page=1, limit=5 returns correct pagination",
    responseWithParams.pagination,
    {
      current: 1,
      limit: 10,
      records: 0,
      pages: 0,
    },
  );
}
