import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_password_reset_session_invalidation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = "SecurePass123!";
  const joined = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joined);
  // 2. Store original access token for later validation
  const originalAccessToken = joined.token.access;
  // 3. Request password reset token
  const resetRequestConnection: api.IConnection = { host: connection.host };
  const resetResponse =
    await api.functional.shoppingMall.seller.reset_request.request(
      resetRequestConnection,
      {
        body: {} satisfies IShoppingMallSnapshot.IResetRequest,
      },
    );
  typia.assert(resetResponse);
  // 4. Reset password using the reset token and new password
  const newPassword = "NewSecurePass456@";
  const resetConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.seller.reset.updatePassword(
    resetConnection,
    {
      body: {
        email: sellerEmail,
      } satisfies IShoppingMallCustomerPasswordReset,
    },
  );
  // 5. Verify original session is invalidated by attempting to use original token
  const invalidConnection: api.IConnection = { host: connection.host };
  invalidConnection.headers = {
    Authorization: `Bearer ${originalAccessToken}`,
  };
  // Attempt to access a protected endpoint with original token - should fail with 401
  await TestValidator.httpError(
    "original session should be invalidated",
    401,
    async () => {
      await api.functional.shoppingMall.seller.reset.updatePassword(
        invalidConnection,
        {
          body: {
            email: sellerEmail,
          } satisfies IShoppingMallCustomerPasswordReset,
        },
      );
    },
  );
}
