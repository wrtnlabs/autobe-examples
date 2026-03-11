import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActor";
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
 * Test password change rejection when current password is incorrect.
 *
 * Scenario:
 * 1. Create and authenticate seller account with known password
 * 2. Attempt password change with wrong current password
 * 3. Verify operation is rejected with 400 Bad Request
 * 4. Verify seller can still authenticate with original password
 */
export async function test_api_seller_password_change_wrong_current(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account with known password
  const originalPassword = RandomGenerator.alphaNumeric(16) + "A1!";
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      password: originalPassword,
    },
  });
  typia.assert(seller);
  // Step 2: Attempt password change with wrong current password
  const newPassword = RandomGenerator.alphaNumeric(16) + "B2@";
  const wrongCurrentPassword = originalPassword + "_wrong";
  await TestValidator.httpError(
    "should reject password change with wrong current password",
    400,
    async () => {
      await api.functional.shoppingMall.seller.password.updatePassword(
        sellerConnection,
        {
          body: {
            current_password: wrongCurrentPassword,
            new_password: newPassword,
          } satisfies IShoppingMallActor.IPasswordUpdate,
        },
      );
    },
  );
  // Step 3: Verify seller can still authenticate with original password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: seller.email,
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loginResult);
  // Verify login succeeded with correct seller info
  TestValidator.equals("seller email matches", loginResult.email, seller.email);
  TestValidator.equals("seller id matches", loginResult.id, seller.id);
}
