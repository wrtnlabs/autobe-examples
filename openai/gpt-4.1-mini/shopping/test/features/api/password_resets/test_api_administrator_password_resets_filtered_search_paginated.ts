import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPasswordReset";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval } from "../../../generate/generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_administrator_password_resets_filtered_search_paginated(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: This test scenario validates the primary use case where an authorized administrator retrieves a paginated list of password reset tokens for sellers and customers.
  // It ensures that the administrator can perform filtered searches based on token strings, date ranges for creation and expiration, and soft deletion status.
  // The test verifies pagination parameters, response structure correctness, and that the sensitive token value is not included in the response.
  // Also, it confirms that only administrators can access the endpoint by using an administrator account.
  // The prerequisite seller approval ensures related sellers for the tokens are valid.
  // 1. Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdministrator.IJoin;
  const adminAuthorized = await authorize_administrator_join(
    { host: connection.host },
    { body: adminJoinBody },
  );
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a seller approval to satisfy password reset prerequisites
  const approval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      { body: { status: "approved" } },
    );
  // 3. Prepare date range values
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10); // 10 days ago
  const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 10); // 10 days later
  // 4. Call the password resets endpoint with various filter criteria
  const requestBody: IShoppingMallSellerPasswordReset.IRequest = {
    sellerId: approval.shoppingMallSellerId,
    token: null,
    createdAtFrom: past.toISOString(),
    createdAtTo: future.toISOString(),
    expiredAtFrom: past.toISOString(),
    expiredAtTo: future.toISOString(),
    usedAtFrom: null,
    usedAtTo: null,
    deleted: false,
    page: 1,
    limit: 10,
    sort: "createdAt desc",
    search: null,
  };
  const response =
    await api.functional.shoppingMall.administrator.password_resets.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", response.pagination.limit === 10);
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  // 6. Validate each data item in paginated results
  for (const item of response.data) {
    typia.assert(item);
    // The sensitive token value must NOT be exposed in response
    TestValidator.predicate(
      "token is omitted in response",
      !Object.hasOwn(item, "token"),
    );
    // Validate required properties presence and types
    TestValidator.predicate(
      "has id",
      typeof item.id === "string" && item.id.length > 0,
    );
    TestValidator.predicate(
      "has createdAt",
      typeof item.createdAt === "string" && item.createdAt.length > 0,
    );
    TestValidator.predicate(
      "has expiredAt",
      typeof item.expiredAt === "string" && item.expiredAt.length > 0,
    );
    // usedAt may be null
    TestValidator.predicate(
      "usedAt is string or null",
      item.usedAt === null ||
        (typeof item.usedAt === "string" && item.usedAt.length > 0),
    );
    // deletedAt may be null
    TestValidator.predicate(
      "deletedAt is string or null",
      item.deletedAt === null ||
        (typeof item.deletedAt === "string" && item.deletedAt.length > 0),
    );
    // Validate seller summary in item
    const seller = item.seller;
    TestValidator.predicate(
      "seller has id",
      typeof seller.id === "string" && seller.id.length > 0,
    );
    TestValidator.predicate(
      "seller has email",
      typeof seller.email === "string" && seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller has shopName",
      typeof seller.shopName === "string" && seller.shopName.length > 0,
    );
    TestValidator.predicate(
      "seller has approvalStatus",
      typeof seller.approvalStatus === "string" &&
        seller.approvalStatus.length > 0,
    );
    // Check approved seller
    TestValidator.equals(
      "seller is approved",
      seller.approvalStatus,
      "approved",
    );
  }
  // 7. Unauthorized access test: use new connection without headers
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access forbidden", async () => {
    await api.functional.shoppingMall.administrator.password_resets.index(
      unauthorizedConnection,
      { body: requestBody },
    );
  });
}
