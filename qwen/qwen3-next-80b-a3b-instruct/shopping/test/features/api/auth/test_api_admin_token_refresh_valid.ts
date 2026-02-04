import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_token_refresh_valid(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin account and obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
  };
  const adminResponse: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: adminData });
  typia.assert(adminResponse);
  // Step 2: Extract the refresh token from the initial authentication
  const initialRefreshToken: string = adminResponse.token.refresh;
  // Step 3: Create a new connection for refresh operation with the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshBody: IShoppingMallAdmin.IRefresh = {
    refresh_token: initialRefreshToken,
  };
  // Step 4: Execute the refresh operation
  const refreshedResponse: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_refresh(refreshConnection, { body: refreshBody });
  typia.assert(refreshedResponse);
  // Step 5: Validate the response properties
  TestValidator.equals(
    "access token exists",
    refreshedResponse.token.access !== undefined,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    refreshedResponse.token.refresh !== undefined,
    true,
  );
  TestValidator.equals(
    "email matches",
    refreshedResponse.email,
    adminResponse.email,
  );
  TestValidator.equals("id matches", refreshedResponse.id, adminResponse.id);
  TestValidator.notEquals(
    "refresh token changed",
    refreshedResponse.token.refresh,
    initialRefreshToken,
  );
  // Step 6: Verify that the old refresh token is invalidated
  const staleRefreshConnection: api.IConnection = { host: connection.host };
  const staleRefreshBody: IShoppingMallAdmin.IRefresh = {
    refresh_token: initialRefreshToken,
  };
  await TestValidator.error("old refresh token should be invalid", async () => {
    await authorize_admin_refresh(staleRefreshConnection, {
      body: staleRefreshBody,
    });
  });
  // Step 7: Validate that the response contains expected user context data
  TestValidator.predicate(
    "totalSellers >= 0",
    refreshedResponse.totalSellers >= 0,
  );
  TestValidator.predicate(
    "pendingSellers >= 0",
    refreshedResponse.pendingSellers >= 0,
  );
  TestValidator.predicate(
    "approvedSellers >= 0",
    refreshedResponse.approvedSellers >= 0,
  );
  TestValidator.predicate(
    "suspendedSellers >= 0",
    refreshedResponse.suspendedSellers >= 0,
  );
  TestValidator.predicate(
    "rejectedSellers >= 0",
    refreshedResponse.rejectedSellers >= 0,
  );
  TestValidator.predicate(
    "bannedSellers >= 0",
    refreshedResponse.bannedSellers >= 0,
  );
  TestValidator.predicate(
    "totalProducts >= 0",
    refreshedResponse.totalProducts >= 0,
  );
  TestValidator.predicate(
    "activeProducts >= 0",
    refreshedResponse.activeProducts >= 0,
  );
  TestValidator.predicate(
    "inactiveProducts >= 0",
    refreshedResponse.inactiveProducts >= 0,
  );
  TestValidator.predicate(
    "outOfStockVariants >= 0",
    refreshedResponse.outOfStockVariants >= 0,
  );
  TestValidator.predicate(
    "productsWithZeroVariants >= 0",
    refreshedResponse.productsWithZeroVariants >= 0,
  );
  TestValidator.predicate(
    "totalOrders >= 0",
    refreshedResponse.totalOrders >= 0,
  );
  TestValidator.predicate("paidOrders >= 0", refreshedResponse.paidOrders >= 0);
  TestValidator.predicate(
    "shippedOrders >= 0",
    refreshedResponse.shippedOrders >= 0,
  );
  TestValidator.predicate(
    "deliveredOrders >= 0",
    refreshedResponse.deliveredOrders >= 0,
  );
  TestValidator.predicate(
    "cancelledOrders >= 0",
    refreshedResponse.cancelledOrders >= 0,
  );
  TestValidator.predicate(
    "refundedOrders >= 0",
    refreshedResponse.refundedOrders >= 0,
  );
  TestValidator.predicate(
    "totalCustomers >= 0",
    refreshedResponse.totalCustomers >= 0,
  );
  TestValidator.predicate(
    "pendingCancellations >= 0",
    refreshedResponse.pendingCancellations >= 0,
  );
  TestValidator.predicate(
    "pendingRefunds >= 0",
    refreshedResponse.pendingRefunds >= 0,
  );
  TestValidator.predicate(
    "activeSessions >= 0",
    refreshedResponse.activeSessions >= 0,
  );
  TestValidator.predicate(
    "systemUptimeHours >= 0",
    refreshedResponse.systemUptimeHours >= 0,
  );
  TestValidator.predicate(
    "averageOrderValue >= 0",
    refreshedResponse.averageOrderValue >= 0,
  );
  TestValidator.predicate(
    "sellerApprovalRate >= 0 && sellerApprovalRate <= 1",
    refreshedResponse.sellerApprovalRate >= 0 &&
      refreshedResponse.sellerApprovalRate <= 1,
  );
  TestValidator.predicate(
    "customerRetentionRate >= 0 && customerRetentionRate <= 1",
    refreshedResponse.customerRetentionRate >= 0 &&
      refreshedResponse.customerRetentionRate <= 1,
  );
}
