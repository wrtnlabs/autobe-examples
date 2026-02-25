import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemReferenceData";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemReferenceData";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reference_data_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Test 1: Filter by name category 'ORDER_STATUS'
  const result1 = await api.functional.shoppingMall.admin.reference_data.index(
    adminConnection,
    {
      body: {
        name: "ORDER_STATUS",
      } satisfies IShoppingMallSystemReferenceData.IRequest,
    },
  );
  typia.assert(result1);
  // Verify filtering worked - all results should have the specified name
  if (result1.data.length > 0) {
    TestValidator.predicate(
      "all results have ORDER_STATUS name",
      result1.data.every((item) => item.name === "ORDER_STATUS"),
    );
  }
  // Test 2: Filter by name category 'PAYMENT_METHOD'
  const result2 = await api.functional.shoppingMall.admin.reference_data.index(
    adminConnection,
    {
      body: {
        name: "PAYMENT_METHOD",
      } satisfies IShoppingMallSystemReferenceData.IRequest,
    },
  );
  typia.assert(result2);
  // Test 3: Filter by name with partial value pattern matching
  const result3 = await api.functional.shoppingMall.admin.reference_data.index(
    adminConnection,
    {
      body: {
        name: "ORDER_STATUS",
        value: "pending",
      } satisfies IShoppingMallSystemReferenceData.IRequest,
    },
  );
  typia.assert(result3);
  // Test 4: Verify pagination works with filtering
  const result4 = await api.functional.shoppingMall.admin.reference_data.index(
    adminConnection,
    {
      body: {
        name: "ORDER_STATUS",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSystemReferenceData.IRequest,
    },
  );
  typia.assert(result4);
  TestValidator.predicate(
    "pagination metadata exists",
    result4.pagination !== null && result4.pagination !== undefined,
  );
  // Test 5: Empty result when no matching data
  const result5 = await api.functional.shoppingMall.admin.reference_data.index(
    adminConnection,
    {
      body: {
        name: "NON_EXISTENT_CATEGORY",
      } satisfies IShoppingMallSystemReferenceData.IRequest,
    },
  );
  typia.assert(result5);
  TestValidator.equals(
    "no results for non-existent category",
    result5.data.length,
    0,
  );
}
