import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Verify that creating a payment method requires admin authentication.
 *
 * Business purpose
 *
 * - Ensure that POST /shoppingMall/admin/paymentMethods is protected and cannot
 *   be called successfully by unauthenticated clients.
 * - Confirm that a correctly authenticated admin can create a payment method with
 *   the same payload, proving that the failure is due to auth, not data.
 *
 * Test steps
 *
 * 1. Prepare a valid payment method creation payload
 *    (IShoppingMallPaymentMethod.ICreate) with realistic data: code,
 *    display_name, provider_type, status, and some optional fields like
 *    allowed_currencies, allowed_countries, min_amount, max_amount.
 * 2. Derive an unauthenticated connection from the given connection by removing or
 *    not providing any Authorization header, without mutating the original
 *    connection.
 * 3. Call api.functional.shoppingMall.admin.paymentMethods.create with the
 *    unauthenticated connection and the prepared payload, and assert that the
 *    API rejects the request due to missing authentication using
 *    TestValidator.httpError with a 401 or 403 expectation.
 * 4. Join an admin using api.functional.auth.admin.join on the original
 *    (authenticated-capable) connection with a valid
 *    IShoppingMallAdminJoin.ICreate body so that the SDK sets Authorization
 *    token automatically.
 * 5. Call the same create endpoint again on the authenticated connection with the
 *    same payload, expect success, and validate the returned
 *    IShoppingMallPaymentMethod via typia.assert.
 * 6. Use TestValidator.equals to verify that the created record matches key
 *    properties from the request payload (code, display_name, provider_type,
 *    status, and selected optional fields).
 */
export async function test_api_admin_payment_method_create_requires_auth(
  connection: api.IConnection,
) {
  // 1. Build a valid payment method creation payload
  const createBody = {
    code: `card_${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Credit Card",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 1000,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  // 2. Build an unauthenticated connection without mutating the original
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 3. Verify that unauthenticated call fails with an HTTP auth error
  await TestValidator.httpError(
    "unauthenticated client cannot create payment method",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.create(
        unauthenticated,
        { body: createBody },
      );
    },
  );

  // 4. Join an admin on the original connection to obtain Authorization token
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
    password: "P@ssw0rd!", // satisfies password format
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 5. Now call the create endpoint again with authenticated connection
  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(created);

  // 6. Validate that the created record reflects the request payload
  TestValidator.equals(
    "created payment method code must match request payload",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created payment method display_name must match",
    created.display_name,
    createBody.display_name,
  );
  TestValidator.equals(
    "created payment method provider_type must match",
    created.provider_type,
    createBody.provider_type,
  );
  TestValidator.equals(
    "created payment method status must match",
    created.status,
    createBody.status,
  );
  TestValidator.equals(
    "created payment method allowed_currencies must match",
    created.allowed_currencies ?? null,
    createBody.allowed_currencies ?? null,
  );
  TestValidator.equals(
    "created payment method allowed_countries must match",
    created.allowed_countries ?? null,
    createBody.allowed_countries ?? null,
  );
  TestValidator.equals(
    "created payment method min_amount must match",
    created.min_amount ?? null,
    createBody.min_amount ?? null,
  );
  TestValidator.equals(
    "created payment method max_amount must match",
    created.max_amount ?? null,
    createBody.max_amount ?? null,
  );
}
