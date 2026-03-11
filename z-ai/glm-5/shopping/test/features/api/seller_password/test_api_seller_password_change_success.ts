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
 * Test successful seller password change.
 * 1. Create and authenticate a seller account
 * 2. Change password with valid current password and new password meeting requirements
 * 3. Verify response returns seller summary with correct id, email, shop_name
 * 4. Verify new password can be used for login
 * 5. Verify current session remains valid after password change
 */
export async function test_api_seller_password_change_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name(1);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      password: originalPassword,
      shopName: shopName,
    },
  });
  typia.assert(seller);
  // 2. Change password with valid credentials
  // Password requirements: 8-128 chars, at least one uppercase, lowercase, digit, special char
  const newPassword = "NewPass123!@#";
  const response =
    await api.functional.shoppingMall.seller.password.updatePassword(
      sellerConnection,
      {
        body: {
          current_password: originalPassword,
          new_password: newPassword,
        } satisfies IShoppingMallActor.IPasswordUpdate,
      },
    );
  typia.assert(response);
  // 3. Verify response returns seller summary with correct information
  TestValidator.equals("response type", response.type, "seller");
  TestValidator.equals("seller id matches", response.id, seller.id);
  TestValidator.equals("seller email matches", response.email, seller.email);
  // Narrow the type to access seller-specific property
  if (response.type === "seller") {
    TestValidator.equals(
      "seller shop name matches",
      response.shopName,
      seller.shop_name,
    );
  }
  // 4. Verify new password can be used for login
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: seller.email,
      password: newPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loginResult);
  TestValidator.equals("login seller id", loginResult.id, seller.id);
  TestValidator.equals("login email", loginResult.email, seller.email);
  // 5. Verify current session remains valid after password change
  // The sellerConnection should still be usable after password change
  const sessionResponse =
    await api.functional.shoppingMall.seller.password.updatePassword(
      sellerConnection,
      {
        body: {
          current_password: newPassword,
          new_password: "AnotherPass456$%^",
        } satisfies IShoppingMallActor.IPasswordUpdate,
      },
    );
  typia.assert(sessionResponse);
  TestValidator.equals("session still valid", sessionResponse.id, seller.id);
}
