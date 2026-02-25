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

export async function test_api_administrator_seller_approvals_filter_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Validate that an administrator can retrieve seller approvals filtered by 'pending' status, paginated correctly, and that the response data matches expectations.
  // 1. Administrator authentication and connection setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongpassword123",
    },
  });
  typia.assert(adminAuth);
  // 2. Make request to retrieve seller approvals filtered by status = 'pending', with pagination parameters
  const page = 1;
  const limit = 10;
  const response =
    await api.functional.shoppingMall.administrator.sellerApprovals.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page,
          limit,
        },
      },
    );
  // 3. Assert response has correct structure
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination page is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination total records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination page matches request",
    response.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    limit,
  );
  // 5. Validate each seller approval item
  for (const approval of response.data) {
    typia.assert(approval); // type assertion
    // Status should be 'pending'
    TestValidator.equals(
      "each approval status is 'pending'",
      approval.status,
      "pending",
    );
    // rejectionReason should be either string or null
    if (
      approval.rejectionReason !== null &&
      approval.rejectionReason !== undefined
    ) {
      TestValidator.predicate(
        "rejectionReason is string or null",
        typeof approval.rejectionReason === "string",
      );
    }
  }
}
