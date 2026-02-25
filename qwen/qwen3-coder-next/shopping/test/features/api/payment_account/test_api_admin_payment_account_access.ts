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

export async function test_api_admin_payment_account_access(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Create administrator connection for payment account access
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.seller.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: "Admin Shop",
      shop_description: null,
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Get seller's payment account as administrator
  // Note: This assumes the payment account exists or there's a way to access it
  const paymentAccount =
    await api.functional.shoppingMall.seller.payment_account.at(
      adminConnection,
      {
        sellerId: seller.data.profile.id,
      },
    );
  typia.assert(paymentAccount);
  // Validate payment account fields
  TestValidator.equals(
    "seller ID matches",
    paymentAccount.seller_id,
    seller.data.profile.id,
  );
  TestValidator.predicate(
    "has valid commission rate",
    paymentAccount.commission_rate >= 0 &&
      paymentAccount.commission_rate <= 100,
  );
  TestValidator.predicate(
    "has valid currency",
    typeof paymentAccount.currency === "string",
  );
  TestValidator.equals(
    "payment processor status is string",
    typeof paymentAccount.payment_processor_status,
    "string",
  );
}
