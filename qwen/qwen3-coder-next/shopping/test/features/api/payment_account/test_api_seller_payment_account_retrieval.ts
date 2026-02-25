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

export async function test_api_seller_payment_account_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration with approved status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.shoppingMall.auth.seller.join(sellerConnection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuthorized);
  // 2. Extract seller ID from authorized response
  const sellerId: string = sellerAuthorized.data.profile.id;
  // 3. Retrieve payment account configuration
  const paymentAccount: IShoppingMallSellerPaymentAccount =
    await api.functional.shoppingMall.seller.payment_account.at(
      sellerConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(paymentAccount);
  // 4. Validate retrieved payment account
  TestValidator.equals("seller ID matches", paymentAccount.seller_id, sellerId);
  TestValidator.predicate(
    "has valid payment processor status",
    ["inactive", "active", "suspended"].includes(
      paymentAccount.payment_processor_status,
    ),
  );
  TestValidator.predicate(
    "commission rate is valid",
    paymentAccount.commission_rate >= 0 &&
      paymentAccount.commission_rate <= 100,
  );
  TestValidator.predicate(
    "minimum payout threshold is non-negative",
    paymentAccount.minimum_payout_threshold >= 0,
  );
  TestValidator.predicate(
    "payout amount is non-negative",
    paymentAccount.total_payout_amount >= 0,
  );
}
