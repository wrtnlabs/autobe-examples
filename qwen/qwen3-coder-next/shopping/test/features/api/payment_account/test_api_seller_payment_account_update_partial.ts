import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPaymentAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPaymentAccount";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_payment_account_update_partial(
  connection: api.IConnection,
): Promise<void> {
  // Seller registration
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.shoppingMall.auth.seller.join(
    joinConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(joinResult);
  // Seller login
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IShoppingMallSeller.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await api.functional.shoppingMall.auth.seller.login(
    loginConnection,
    {
      body: loginInput,
    },
  );
  typia.assert(loginResult);
  // Update only specific fields
  const updateInput = {
    bank_name: RandomGenerator.name(),
    commission_rate: 5 + Math.floor(Math.random() * 10),
  } satisfies IShoppingMallSellerPaymentAccount.IUpdate;
  // Perform partial update
  const updatedAccount =
    await api.functional.shoppingMall.seller.payment_account.update(
      loginConnection,
      { body: updateInput },
    );
  typia.assert(updatedAccount);
  // Validate changes
  TestValidator.equals(
    "bank_name updated",
    updatedAccount.bank_name,
    updateInput.bank_name,
  );
  TestValidator.equals(
    "commission_rate updated",
    updatedAccount.commission_rate,
    updateInput.commission_rate,
  );
}
