import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

export async function test_api_admin_payment_method_create_with_optional_constraints(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorization context via SDK
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a payment method with all optional constraints explicitly set
  const paymentMethodCreateBody = {
    code: `bank_transfer_global_${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Global Bank Transfer",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    provider_type: "bank_gateway",
    allowed_currencies: "USD,EUR,KRW",
    allowed_countries: "US,DE,KR",
    min_amount: 10.0,
    max_amount: 100000.0,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(created);

  // 3. Validate that optional fields are persisted as non-null and match input
  TestValidator.equals(
    "payment method code should match input",
    created.code,
    paymentMethodCreateBody.code,
  );
  TestValidator.equals(
    "payment method display_name should match input",
    created.display_name,
    paymentMethodCreateBody.display_name,
  );
  TestValidator.equals(
    "payment method description should match input non-null",
    created.description,
    paymentMethodCreateBody.description,
  );
  TestValidator.equals(
    "payment method provider_type should match input",
    created.provider_type,
    paymentMethodCreateBody.provider_type,
  );
  TestValidator.equals(
    "payment method allowed_currencies should persist non-null string",
    created.allowed_currencies,
    paymentMethodCreateBody.allowed_currencies,
  );
  TestValidator.equals(
    "payment method allowed_countries should persist non-null string",
    created.allowed_countries,
    paymentMethodCreateBody.allowed_countries,
  );
  TestValidator.equals(
    "payment method min_amount should match input",
    created.min_amount,
    paymentMethodCreateBody.min_amount,
  );
  TestValidator.equals(
    "payment method max_amount should match input",
    created.max_amount,
    paymentMethodCreateBody.max_amount,
  );
  TestValidator.equals(
    "payment method status should remain active",
    created.status,
    paymentMethodCreateBody.status,
  );

  // 4. Business rule validation: min_amount <= max_amount
  const minAmount = created.min_amount ?? 0;
  const maxAmount = created.max_amount ?? 0;
  TestValidator.predicate(
    "min_amount must be less than or equal to max_amount",
    minAmount <= maxAmount,
  );
}
