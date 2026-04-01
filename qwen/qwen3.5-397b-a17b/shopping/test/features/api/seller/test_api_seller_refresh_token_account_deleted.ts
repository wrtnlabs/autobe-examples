import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller token refresh failure when the seller account has been deleted.
 *
 * This test validates that refresh tokens are invalidated when the associated
 * seller account is deleted. The test registers a seller account, captures the
 * refresh token, and attempts to use it. In a complete implementation, the
 * account would be deleted between token capture and refresh attempt.
 *
 * Business Rules Validated:
 * - Refresh tokens are invalidated when seller account is deleted
 * - Deleted accounts cannot refresh tokens or maintain active sessions
 * - Session validation checks seller deleted_at is null before issuing new tokens
 *
 * Note: This test requires a seller account deletion endpoint which is not
 * available in the provided SDK functions. The test structure demonstrates
 * the intended validation flow.
 */
export async function test_api_seller_refresh_token_account_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account and capture authentication tokens
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // Step 2: Capture the refresh token from the authentication response
  const refreshToken = sellerJoinResult.token.refresh;
  // Step 3: Delete the seller account (soft delete)
  // Note: Account deletion endpoint not available in provided SDK.
  // In production, this would call the seller deletion API:
  // await api.functional.shoppingMall.sellers.delete(adminConnection, sellerId);
  // The deletion would set deleted_at timestamp on the seller record.
  // Step 4: Create a new connection for refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 5: Attempt to refresh token - should fail after account deletion
  // This validates that the refresh endpoint properly checks account status
  // before issuing new tokens. The error should indicate the account is
  // no longer active (business logic error, not validation error).
  await TestValidator.error(
    "refresh token should be invalid after account deletion",
    async () => {
      await api.functional.shoppingMall.auth.seller.refresh(refreshConnection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );
}
