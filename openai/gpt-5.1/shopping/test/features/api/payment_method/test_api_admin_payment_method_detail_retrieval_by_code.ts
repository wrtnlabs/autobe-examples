import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Validate that an admin can retrieve payment method details by business code.
 *
 * Business flow:
 *
 * 1. Admin joins the platform using /auth/admin/join and becomes authenticated.
 * 2. Admin creates a payment method via /shoppingMall/admin/paymentMethods with a
 *    unique business code.
 * 3. Admin fetches the payment method detail via
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}.
 * 4. The GET response configuration must match the created configuration and
 *    expose proper audit fields.
 */
export async function test_api_admin_payment_method_detail_retrieval_by_code(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Create a payment method with a unique code
  const uniqueSuffix = RandomGenerator.alphaNumeric(8);
  const paymentCode = `wallet_promo_${uniqueSuffix}`;

  const createBody = {
    code: paymentCode,
    display_name: `Wallet Promo ${uniqueSuffix}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_type: "wallet",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 10,
    max_amount: 100000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 3. Retrieve the payment method by code
  const fetched: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.at(connection, {
      paymentMethodCode: paymentCode,
    });
  typia.assert(fetched);

  // 4. Validate that configuration fields are consistent
  TestValidator.equals(
    "payment method code must match between create and fetch",
    fetched.code,
    created.code,
  );

  TestValidator.equals(
    "display_name must be preserved between create and fetch",
    fetched.display_name,
    created.display_name,
  );

  TestValidator.equals(
    "provider_type must be preserved between create and fetch",
    fetched.provider_type,
    created.provider_type,
  );

  TestValidator.equals(
    "status must be preserved between create and fetch",
    fetched.status,
    created.status,
  );

  TestValidator.equals(
    "description must be preserved between create and fetch",
    fetched.description,
    created.description,
  );

  TestValidator.equals(
    "allowed_currencies must be preserved between create and fetch",
    fetched.allowed_currencies,
    created.allowed_currencies,
  );

  TestValidator.equals(
    "allowed_countries must be preserved between create and fetch",
    fetched.allowed_countries,
    created.allowed_countries,
  );

  TestValidator.equals(
    "min_amount must be preserved between create and fetch",
    fetched.min_amount,
    created.min_amount,
  );

  TestValidator.equals(
    "max_amount must be preserved between create and fetch",
    fetched.max_amount,
    created.max_amount,
  );

  // 5. Validate audit fields presence and temporal consistency
  TestValidator.predicate(
    "created payment method must have a non-empty id",
    typeof fetched.id === "string" && fetched.id.length > 0,
  );

  TestValidator.predicate(
    "created_at must be a non-empty ISO date-time string",
    typeof fetched.created_at === "string" && fetched.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be a non-empty ISO date-time string",
    typeof fetched.updated_at === "string" && fetched.updated_at.length > 0,
  );

  const createdTime = new Date(fetched.created_at).getTime();
  const updatedTime = new Date(fetched.updated_at).getTime();

  TestValidator.predicate(
    "updated_at must be greater than or equal to created_at",
    !Number.isNaN(createdTime) &&
      !Number.isNaN(updatedTime) &&
      updatedTime >= createdTime,
  );
}
