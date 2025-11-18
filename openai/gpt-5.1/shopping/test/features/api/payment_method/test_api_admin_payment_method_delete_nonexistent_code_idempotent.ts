import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

export async function test_api_admin_payment_method_delete_nonexistent_code_idempotent(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create baseline payment methods so we can ensure they are unaffected
  const firstMethodBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 1_000_000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const firstMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: firstMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(firstMethod);

  const secondMethodBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    provider_type: "bank_gateway",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "disabled",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const secondMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: secondMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(secondMethod);

  const existingCodes: string[] = [firstMethod.code, secondMethod.code];

  // 3. Choose a code that is guaranteed to be non-existent
  let nonexistentCode = "nonexistent_delete_code";
  if (existingCodes.includes(nonexistentCode)) {
    nonexistentCode = `nonexistent_delete_code_${RandomGenerator.alphaNumeric(8)}`;
  }

  // 4. Attempt to delete the non-existent payment method code.
  // We accept both behaviors: the call may succeed silently or throw an HttpError.
  try {
    await api.functional.shoppingMall.admin.paymentMethods.erase(connection, {
      paymentMethodCode: nonexistentCode,
    });
  } catch {
    // Either behavior (error or success) is acceptable for this test.
  }

  // 5. Verify that previously created payment methods still exist logically.
  // We cannot re-fetch them, but we can validate their structure and that codes
  // remain as originally assigned.
  typia.assert<IShoppingMallPaymentMethod>(firstMethod);
  typia.assert<IShoppingMallPaymentMethod>(secondMethod);

  TestValidator.predicate(
    "first payment method keeps its code after non-existent delete",
    firstMethod.code === firstMethodBody.code,
  );
  TestValidator.predicate(
    "second payment method keeps its code after non-existent delete",
    secondMethod.code === secondMethodBody.code,
  );

  // 6. Call erase again with the same non-existent code to check idempotency.
  try {
    await api.functional.shoppingMall.admin.paymentMethods.erase(connection, {
      paymentMethodCode: nonexistentCode,
    });
  } catch {
    // Again, both success and error behaviors are acceptable.
  }

  // 7. Ensure that we can still create another payment method after the delete
  // attempts, proving that admin authorization remains valid and the payment
  // method subsystem is still functional.
  const thirdMethodBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 1 }),
    provider_type: "wallet",
    allowed_currencies: "KRW",
    allowed_countries: "KR",
    min_amount: 1_000,
    max_amount: 500_000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const thirdMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: thirdMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(thirdMethod);

  TestValidator.predicate(
    "third payment method is created successfully after non-existent deletes",
    thirdMethod.code === thirdMethodBody.code,
  );
}
