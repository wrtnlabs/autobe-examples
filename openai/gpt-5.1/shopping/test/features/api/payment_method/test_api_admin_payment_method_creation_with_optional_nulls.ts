import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

export async function test_api_admin_payment_method_creation_with_optional_nulls(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authorized admin context (token handled by SDK)
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Admin#1234" as string & tags.Format<"password">,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create payment method with all optional fields explicitly null
  const uniqueCode = `cod_${RandomGenerator.alphaNumeric(12)}`;
  const createBody = {
    code: uniqueCode,
    display_name: "Cash on Delivery",
    provider_type: "cod",
    description: null,
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: createBody,
    });

  // 3. Type-level validation of response
  typia.assert<IShoppingMallPaymentMethod>(created);

  // 4. Core field assertions
  TestValidator.equals(
    "payment method code should match input",
    created.code,
    uniqueCode,
  );
  TestValidator.equals(
    "payment method display_name should match input",
    created.display_name,
    createBody.display_name,
  );
  TestValidator.equals(
    "payment method provider_type should match input",
    created.provider_type,
    createBody.provider_type,
  );
  TestValidator.equals(
    "payment method status should match input",
    created.status,
    createBody.status,
  );

  // 5. Optional nullable fields should be either null or undefined; when null was sent,
  // it is acceptable for DB/ORM to persist null or normalize to null/undefined in DTO.
  TestValidator.predicate(
    "description should be null or undefined after creation",
    created.description === null || created.description === undefined,
  );
  TestValidator.predicate(
    "allowed_currencies should be null or undefined after creation",
    created.allowed_currencies === null ||
      created.allowed_currencies === undefined,
  );
  TestValidator.predicate(
    "allowed_countries should be null or undefined after creation",
    created.allowed_countries === null ||
      created.allowed_countries === undefined,
  );
  TestValidator.predicate(
    "min_amount should be null or undefined after creation",
    created.min_amount === null || created.min_amount === undefined,
  );
  TestValidator.predicate(
    "max_amount should be null or undefined after creation",
    created.max_amount === null || created.max_amount === undefined,
  );

  // 6. Basic sanity on generated timestamps
  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );
}
