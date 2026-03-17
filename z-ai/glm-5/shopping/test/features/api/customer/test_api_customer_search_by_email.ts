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
 * Test administrator searches for customer accounts using email address filtering.
 * Validates case-insensitive exact match, empty results for non-existent emails,
 * and proper response structure with orderCount field.
 */
export async function test_api_customer_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Search with non-existent email - should return empty results
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const emptyResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "non-existent email returns empty data",
    emptyResult.data,
    [],
  );
  TestValidator.equals(
    "non-existent email returns zero records",
    emptyResult.pagination.records,
    0,
  );
  // 3. Search for any customers without filter to get test data
  const allCustomersResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(allCustomersResult);
  // 4. If there are existing customers, test case-insensitive email search
  if (allCustomersResult.data.length > 0) {
    const existingCustomer = allCustomersResult.data[0];
    const originalEmail = existingCustomer.email;
    // Test case-insensitive search - uppercase variation
    const uppercaseEmail = originalEmail.toUpperCase();
    const uppercaseResult =
      await api.functional.shoppingMall.administrator.customers.index(
        adminConnection,
        {
          body: {
            email: uppercaseEmail,
          } satisfies IShoppingMallCustomer.IRequest,
        },
      );
    typia.assert(uppercaseResult);
    // Test case-insensitive search - lowercase variation
    const lowercaseEmail = originalEmail.toLowerCase();
    const lowercaseResult =
      await api.functional.shoppingMall.administrator.customers.index(
        adminConnection,
        {
          body: {
            email: lowercaseEmail,
          } satisfies IShoppingMallCustomer.IRequest,
        },
      );
    typia.assert(lowercaseResult);
    // Validate case-insensitive match returns same customer
    TestValidator.predicate(
      "case-insensitive search returns results",
      uppercaseResult.data.length >= 1,
    );
    TestValidator.equals(
      "different case variations return same customer ID",
      uppercaseResult.data[0]?.id,
      lowercaseResult.data[0]?.id,
    );
    TestValidator.equals(
      "found customer matches original email (case-insensitive)",
      uppercaseResult.data[0]?.email.toLowerCase(),
      originalEmail.toLowerCase(),
    );
    // Validate response structure includes orderCount
    const foundCustomer = uppercaseResult.data[0];
    if (foundCustomer !== undefined) {
      TestValidator.predicate(
        "customer summary includes orderCount",
        typeof foundCustomer.orderCount === "number",
      );
      TestValidator.predicate(
        "orderCount is non-negative",
        foundCustomer.orderCount >= 0,
      );
    }
  }
}
