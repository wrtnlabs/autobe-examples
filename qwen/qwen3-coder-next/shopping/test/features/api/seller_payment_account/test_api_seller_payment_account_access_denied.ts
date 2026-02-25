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

export async function test_api_seller_payment_account_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections for each seller
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerBConnection: api.IConnection = { host: connection.host };
  // Step 1: Register and authenticate seller A
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `Seller A Shop ${RandomGenerator.alphabets(6)}`,
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // Create new connection with seller A's token
  const sellerATokenConnection: api.IConnection = { host: connection.host };
  sellerATokenConnection.headers = {
    authorization: sellerA.token.access,
  };
  // Step 2: Register and authenticate seller B
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `Seller B Shop ${RandomGenerator.alphabets(6)}`,
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // Create new connection with seller B's token
  const sellerBTokenConnection: api.IConnection = { host: connection.host };
  sellerBTokenConnection.headers = {
    authorization: sellerB.token.access,
  };
  // Step 3: Seller A attempts to access seller B's payment account (should be denied)
  let accessDenied = false;
  try {
    const sellerAPaymentAccountResult =
      await api.functional.shoppingMall.seller.payment_account.at(
        sellerATokenConnection,
        {
          sellerId: sellerB.data.profile.id,
        },
      );
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const status = (error as any).status;
      if (status === 403) {
        accessDenied = true;
      }
    }
  }
  // Step 4: Verify that seller A cannot access seller B's payment account
  TestValidator.predicate(
    "seller A cannot access seller B's payment account",
    () => accessDenied === true,
  );
  // Step 5: Verify seller A can access their own payment account (should succeed)
  const sellerAMyPaymentAccount =
    await api.functional.shoppingMall.seller.payment_account.at(
      sellerATokenConnection,
      {
        sellerId: sellerA.data.profile.id,
      },
    );
  typia.assert(sellerAMyPaymentAccount);
}