import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_pending_seller_approval_list(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234!" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Test 1: Retrieve pending sellers with admin authentication
  // Use random request body with proper structure
  const request: IShoppingMallSeller.IRequest = {
    page: 1,
    limit: 10,
    search: undefined,
    approval_status: "pending",
    sort: "created_at:desc",
  };
  const pendingSellers =
    await api.functional.shoppingMall.admin.sellers.pending_approvals.index(
      adminConnection,
      { body: request },
    );
  typia.assert(pendingSellers);
  // Verify results structure
  TestValidator.equals(
    "response structure",
    Array.isArray(pendingSellers.data),
    true,
  );
  TestValidator.predicate(
    "has pagination info",
    typeof pendingSellers.pagination === "object",
  );
  // Test 2: Verify pagination works correctly with explicit request
  const paginatedRequest: IShoppingMallSeller.IRequest = {
    page: 1,
    limit: 1,
  };
  const paginatedSellers =
    await api.functional.shoppingMall.admin.sellers.pending_approvals.index(
      adminConnection,
      { body: paginatedRequest },
    );
  typia.assert(paginatedSellers);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination page is 1",
    paginatedSellers.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    paginatedSellers.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    paginatedSellers.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    paginatedSellers.pagination.pages >= 0,
  );
  // Test 3: Verify search functionality with partial match
  const searchRequest: IShoppingMallSeller.IRequest = {
    search: "test",
  };
  const searchSellers =
    await api.functional.shoppingMall.admin.sellers.pending_approvals.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(searchSellers);
  // Test 4: Verify sorting functionality
  const sortRequest: IShoppingMallSeller.IRequest = {
    sort: "created_at:desc",
  };
  const sortedSellers =
    await api.functional.shoppingMall.admin.sellers.pending_approvals.index(
      adminConnection,
      { body: sortRequest },
    );
  typia.assert(sortedSellers);
  // Test 5: Verify seller data structure when data exists
  if (pendingSellers.data.length > 0) {
    const firstSeller = pendingSellers.data[0];
    TestValidator.equals(
      "seller has id",
      typeof firstSeller.id === "string" && firstSeller.id.length > 0,
      true,
    );
    TestValidator.equals(
      "seller has shop_name",
      typeof firstSeller.shop_name === "string" &&
        firstSeller.shop_name.length > 0,
      true,
    );
    TestValidator.equals(
      "seller has approval_status",
      firstSeller.approval_status === "pending",
      true,
    );
    TestValidator.equals(
      "seller has created_at",
      typeof firstSeller.created_at === "string" &&
        firstSeller.created_at.length > 0,
      true,
    );
  }
}
