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

export async function test_api_seller_payment_account_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = `${RandomGenerator.name().toLowerCase().replace(/\s/g, "")}@example.com`;
  const customerPassword = "1234";
  await api.functional.shoppingMall.auth.seller.join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: null,
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  await api.functional.shoppingMall.auth.seller.login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Seller A registration and login
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = `${RandomGenerator.name().toLowerCase().replace(/\s/g, "")}@example.com`;
  const sellerAPassword = "1234";
  const sellerAName = RandomGenerator.name();
  await api.functional.shoppingMall.auth.seller.join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      shop_name: sellerAName,
      shop_description: null,
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  const sellerALoginResponse =
    await api.functional.shoppingMall.auth.seller.login(sellerAConnection, {
      body: {
        email: sellerAEmail,
        password: sellerAPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerALoginResponse);
  // 3. Seller A updates payment account
  const sellerAPaymentAccountUpdate = {
    bank_name: "Test Bank",
    account_number: "1234567890",
    account_holder_name: "Seller A",
    payment_processor_status: "active",
    commission_rate: 5,
    minimum_payout_threshold: 10000,
    currency: "KRW",
    payout_schedule: "monthly",
    auto_payout_enabled: true,
    tax_id: null,
    business_registration_number: null,
    verification_status: "verified",
  } satisfies IShoppingMallSellerPaymentAccount.IUpdate;
  const sellerAPaymentAccount =
    await api.functional.shoppingMall.seller.payment_account.update(
      sellerAConnection,
      {
        body: sellerAPaymentAccountUpdate,
      },
    );
  typia.assert(sellerAPaymentAccount);
  // 4. Customer attempts to update Seller A's payment account (should fail)
  const customerUpdateAttempt = {
    bank_name: "Fraudulent Bank",
    account_number: "0000000000",
  } satisfies IShoppingMallSellerPaymentAccount.IUpdate;
  await TestValidator.error(
    "customer cannot update seller's payment account",
    async () => {
      await api.functional.shoppingMall.seller.payment_account.update(
        customerConnection,
        {
          body: customerUpdateAttempt,
        },
      );
    },
  );
  // 5. Verify Seller A's payment account remains unchanged
  const finalSellerAPaymentAccount =
    await api.functional.shoppingMall.seller.payment_account.update(
      sellerAConnection,
      {
        body: {} satisfies DeepPartial<IShoppingMallSellerPaymentAccount.IUpdate>,
      },
    );
  TestValidator.equals(
    "payment account ID unchanged",
    sellerAPaymentAccount.id,
    finalSellerAPaymentAccount.id,
  );
  TestValidator.equals(
    "bank name unchanged",
    sellerAPaymentAccount.bank_name,
    finalSellerAPaymentAccount.bank_name,
  );
  TestValidator.equals(
    "account number unchanged",
    sellerAPaymentAccount.account_number,
    finalSellerAPaymentAccount.account_number,
  );
  TestValidator.notEquals(
    "customer update attempt did not affect seller account",
    finalSellerAPaymentAccount.bank_name,
    "Fraudulent Bank",
  );
}
