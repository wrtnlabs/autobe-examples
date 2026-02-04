import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an actor-specific connection for seller registration
  const joinConnection: api.IConnection = { host: connection.host };
  // Step 2: Register a new seller account using the utility function
  const registeredSeller: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(registeredSeller);
  // Step 3: Create a new actor-specific connection for seller login
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 4: Log in the registered seller to obtain a refresh token
  const authenticatedSeller: IShoppingMallSeller.IAuthorized =
    await authorize_seller_login(loginConnection, {
      body: {
        email: registeredSeller.email,
        password: "123456789012", // Password used in previous step
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(authenticatedSeller);
  // Step 5: Prepare the refresh token for the refresh operation
  const refreshBody: IShoppingMallSeller.IRefresh = {
    value: authenticatedSeller.token.refresh,
  };
  // Step 6: Create a new actor-specific connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 7: Call the seller refresh endpoint with the valid refresh token
  const refreshedSeller: IShoppingMallSeller.IAuthorized =
    await authorize_seller_refresh(refreshConnection, {
      body: refreshBody,
    });
  typia.assert(refreshedSeller);
  // Step 8: Verify that the new access token is different from the original one
  TestValidator.notEquals(
    "new access token should be different",
    refreshedSeller.token.access,
    authenticatedSeller.token.access,
  );
  // Step 9: Verify that the new refresh token is different from the original one
  TestValidator.notEquals(
    "new refresh token should be different",
    refreshedSeller.token.refresh,
    authenticatedSeller.token.refresh,
  );
  // Step 10: Verify that the seller profile information is preserved
  TestValidator.equals(
    "seller email should match",
    refreshedSeller.email,
    authenticatedSeller.email,
  );
  TestValidator.equals(
    "seller seller_id should match",
    refreshedSeller.seller_id,
    authenticatedSeller.seller_id,
  );
  TestValidator.equals(
    "seller role should match",
    refreshedSeller.role,
    authenticatedSeller.role,
  );
  TestValidator.equals(
    "seller status should match",
    refreshedSeller.status,
    authenticatedSeller.status,
  );
  TestValidator.equals(
    "seller approval_status should match",
    refreshedSeller.approval_status,
    authenticatedSeller.approval_status,
  );
  TestValidator.equals(
    "seller is_suspended should match",
    refreshedSeller.is_suspended,
    authenticatedSeller.is_suspended,
  );
  TestValidator.equals(
    "seller shop_name should match",
    refreshedSeller.shop_name,
    authenticatedSeller.shop_name,
  );
  TestValidator.equals(
    "seller created_at should match",
    refreshedSeller.created_at,
    authenticatedSeller.created_at,
  );
  TestValidator.equals(
    "seller updated_at should match",
    refreshedSeller.updated_at,
    authenticatedSeller.updated_at,
  );
  // Step 11: Verify that the refreshed token object has proper expiration formats
  TestValidator.predicate("access token expiry should be ISO date-time", () => {
    try {
      new Date(refreshedSeller.token.expired_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate(
    "refresh token expiry should be ISO date-time",
    () => {
      try {
        new Date(refreshedSeller.token.refreshable_until);
        return true;
      } catch {
        return false;
      }
    },
  );
}
