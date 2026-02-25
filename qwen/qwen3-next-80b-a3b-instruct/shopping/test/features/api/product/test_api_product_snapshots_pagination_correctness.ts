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

export async function test_api_product_snapshots_pagination_correctness(
  connection: api.IConnection,
): Promise<void> {
  // Create customer account for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Use pre-seeded product ID that is known to have exactly 12 snapshots
  // This is required because E2E tests assume test environment seed data
  const productId = "00000000-0000-0000-0000-000000000000";
  // Retrieve snapshots with pagination parameters: page=2, limit=5
  const result =
    await api.functional.shoppingMall.customer.products.snapshots.at(
      customerConnection,
      {
        productId,
      },
    );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 2);
  TestValidator.equals("pagination limit", result.pagination.limit, 5);
  TestValidator.equals(
    "pagination total records",
    result.pagination.records,
    12,
  );
  TestValidator.equals("pagination total pages", result.pagination.pages, 3);
  // Validate data contains exactly 5 snapshots (page 2)
  TestValidator.equals("number of snapshots returned", result.data.length, 5);
}
