import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_approvals_filter_by_seller_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving seller approvals filtered by sellerId and createdAt date range
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  // Use random but valid administrator join info for authentication
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password123",
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Step 2: Prepare filter criteria with a random sellerId and date range
  // Use a valid random UUID value for sellerId
  const filterSellerId = typia.random<string & tags.Format<"uuid">>();
  // Date range for createdAt filter
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30); // 30 days ago
  const toDate = new Date(); // now
  const requestBody: IShoppingMallSellerApproval.IRequest = {
    sellerId: filterSellerId,
    createdAtFrom: fromDate.toISOString() as string & tags.Format<"date-time">,
    createdAtTo: toDate.toISOString() as string & tags.Format<"date-time">,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  // Step 3: Call the filtered seller approvals API endpoint via utility
  const result =
    await api.functional.shoppingMall.administrator.sellerApprovals.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(result);
  // Step 4: Assertions
  // Pagination checks
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is equal or less than requested",
    result.pagination.limit <= 20 && result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages count is consistent",
    result.pagination.pages >= 0 &&
      (result.pagination.pages === 0 ||
        result.pagination.pages >= result.pagination.current),
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    result.pagination.records >= 0,
  );
  // Step 5: Validate data consistency
  for (const approval of result.data) {
    // Each approval should match sellerId filter
    TestValidator.equals(
      "approval seller ID matches filter",
      approval.seller.id,
      filterSellerId,
    );
    // Each approval's createdAt must be within requested date range
    const createdAt = new Date(approval.createdAt);
    TestValidator.predicate(
      "approval createdAt is within from date",
      createdAt.getTime() >= fromDate.getTime(),
    );
    TestValidator.predicate(
      "approval createdAt is within to date",
      createdAt.getTime() <= toDate.getTime(),
    );
    // Validate nested seller summary data
    typia.assert(approval.seller);
  }
}
