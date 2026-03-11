import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator successfully retrieves a paginated list of all customer accounts.
 *
 * This test validates:
 * 1. Administrator authentication and access to customer listing endpoint
 * 2. Pagination metadata structure (current, limit, records, pages)
 * 3. Customer summary data structure with all required fields
 * 4. Soft-deleted customers are excluded from results (deletedAt is null)
 * 5. Results are sorted by creation date descending (newest first)
 * 6. OrderCount field is correctly computed as non-negative integer
 */
export async function test_api_customer_list_paginated_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve paginated list of customers without filters
  const result =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata is present
  // typia.assert validates all structure, we only test business logic
  // 4. Validate soft-deleted customers are excluded (deletedAt must be null)
  for (const customer of result.data) {
    TestValidator.equals(
      "soft-deleted customers excluded",
      customer.deletedAt,
      null,
    );
  }
  // 5. Validate results are sorted by creation date descending (newest first)
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = new Date(result.data[i].createdAt);
      const next = new Date(result.data[i + 1].createdAt);
      TestValidator.predicate(
        "results sorted by createdAt descending",
        current >= next,
      );
    }
  }
}
