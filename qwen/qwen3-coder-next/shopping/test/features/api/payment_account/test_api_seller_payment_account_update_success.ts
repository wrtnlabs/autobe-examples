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

export async function test_api_seller_payment_account_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration with approval
  const joinConnection: api.IConnection = { host: connection.host };
  const shopName = RandomGenerator.name();
  const joinResult = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: shopName,
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // 2. Seller login
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: joinResult.data.profile.shop_name + "@example.com",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // 3. Update payment account
  const updateConnection: api.IConnection = { host: connection.host };
  updateConnection.headers = { Authorization: loginResult.token.access };
  const updateBody = {
    bank_name: "Test Bank",
    account_number: "123-456-7890123",
    account_holder_name: "Test Seller",
    payment_processor_status: "active",
    commission_rate: 10,
    minimum_payout_threshold: 50000,
    currency: "KRW",
    payout_schedule: "monthly",
    auto_payout_enabled: true,
    tax_id: typia.random<string & tags.Format<"uuid">>(),
    business_registration_number: "123-45-67890",
    verification_status: "verified",
  } satisfies IShoppingMallSellerPaymentAccount.IUpdate;
  const updatedAccount =
    await api.functional.shoppingMall.seller.payment_account.update(
      updateConnection,
      { body: updateBody },
    );
  typia.assert(updatedAccount);
  // 4. Validate updated fields
  TestValidator.equals(
    "bank_name updated",
    updatedAccount.bank_name,
    "Test Bank",
  );
  TestValidator.equals(
    "account_number updated",
    updatedAccount.account_number,
    "123-456-7890123",
  );
  TestValidator.equals(
    "account_holder_name updated",
    updatedAccount.account_holder_name,
    "Test Seller",
  );
  TestValidator.equals(
    "payment_processor_status updated",
    updatedAccount.payment_processor_status,
    "active",
  );
  TestValidator.equals(
    "commission_rate updated",
    updatedAccount.commission_rate,
    10,
  );
  TestValidator.equals(
    "minimum_payout_threshold updated",
    updatedAccount.minimum_payout_threshold,
    50000,
  );
  TestValidator.equals("currency updated", updatedAccount.currency, "KRW");
  TestValidator.equals(
    "payout_schedule updated",
    updatedAccount.payout_schedule,
    "monthly",
  );
  TestValidator.equals(
    "auto_payout_enabled updated",
    updatedAccount.auto_payout_enabled,
    true,
  );
  TestValidator.equals(
    "verification_status updated",
    updatedAccount.verification_status,
    "verified",
  );
  // 5. Validate server-managed fields exist
  TestValidator.predicate("has id", () => !!updatedAccount.id);
  TestValidator.predicate("has seller_id", () => !!updatedAccount.seller_id);
  TestValidator.predicate("has created_at", () => !!updatedAccount.created_at);
  TestValidator.predicate("has updated_at", () => !!updatedAccount.updated_at);
}
