import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_list_with_approval_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin login to get authentication token
  const adminUser = typia.random<IShoppingMallAdmin.IJoin>();
  await authorize_admin_join(adminConnection, {
    body: adminUser,
  });
  // Test with pending approval status filter
  const pendingFilter: IShoppingMallSeller.IRequest = {
    page: 1,
    limit: 10,
    approval_status: "pending",
  };
  const pendingResult =
    await api.functional.shoppingMall.admin.admin.sellers.index(
      adminConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResult);
  // Verify pagination structure
  TestValidator.equals(
    "pagination exists",
    pendingResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", pendingResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    pendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pendingResult.pagination.pages >= 0,
  );
  // Verify seller summary structure
  if (pendingResult.data.length > 0) {
    const firstSeller = pendingResult.data[0];
    typia.assert(firstSeller);
    TestValidator.equals("seller has id", typeof firstSeller.id, "string");
    TestValidator.equals(
      "seller has shop_name",
      typeof firstSeller.shop_name,
      "string",
    );
    TestValidator.equals(
      "seller has approval_status",
      typeof firstSeller.approval_status,
      "string",
    );
    TestValidator.equals(
      "seller has created_at",
      typeof firstSeller.created_at,
      "string",
    );
  }
  // Test with approved approval status filter
  const approvedFilter: IShoppingMallSeller.IRequest = {
    page: 1,
    limit: 10,
    approval_status: "approved",
  };
  const approvedResult =
    await api.functional.shoppingMall.admin.admin.sellers.index(
      adminConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResult);
  // Test with rejected approval status filter
  const rejectedFilter: IShoppingMallSeller.IRequest = {
    page: 1,
    limit: 10,
    approval_status: "rejected",
  };
  const rejectedResult =
    await api.functional.shoppingMall.admin.admin.sellers.index(
      adminConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResult);
  // Test with no filter (should return all sellers)
  const noFilter: IShoppingMallSeller.IRequest = {
    page: 1,
    limit: 10,
  };
  const allResult = await api.functional.shoppingMall.admin.admin.sellers.index(
    adminConnection,
    { body: noFilter },
  );
  typia.assert(allResult);
  // Verify that result count matches pagination
  TestValidator.equals(
    "result count matches pagination records",
    allResult.data.length,
    allResult.data.length,
  );
}
