import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

export async function test_api_admin_payment_method_creation_with_constraints(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authenticated context via Authorization header
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Use realistic but simple session context URLs
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
    // ip is optional and nullable; omit it to let backend derive from request metadata
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare payment method creation payload with full constraints
  const uniqueSuffix: string = RandomGenerator.alphaNumeric(8);
  const code: string = `bank_transfer_krw_${uniqueSuffix}`;

  const description: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 10,
  });

  const minAmount = 10_000;
  const maxAmount = 1_000_000;

  const createBody = {
    code,
    display_name: "Bank Transfer (KRW only)",
    description,
    provider_type: "bank_gateway",
    allowed_currencies: "KRW",
    allowed_countries: "KR",
    min_amount: minAmount,
    max_amount: maxAmount,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  // 3. Call admin payment method creation API
  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(created);

  // 4. Validate that configured fields are persisted correctly
  TestValidator.equals(
    "payment method code should match input code",
    created.code,
    code,
  );
  TestValidator.equals(
    "display_name should match input display_name",
    created.display_name,
    createBody.display_name,
  );

  TestValidator.predicate(
    "description should be present and non-null",
    created.description !== null && created.description !== undefined,
  );
  TestValidator.equals(
    "description should match input description",
    created.description ?? null,
    createBody.description ?? null,
  );

  TestValidator.equals(
    "provider_type should match input provider_type",
    created.provider_type,
    createBody.provider_type,
  );

  TestValidator.equals(
    "allowed_currencies should match input allowed_currencies",
    created.allowed_currencies ?? null,
    createBody.allowed_currencies ?? null,
  );
  TestValidator.equals(
    "allowed_countries should match input allowed_countries",
    created.allowed_countries ?? null,
    createBody.allowed_countries ?? null,
  );

  TestValidator.equals(
    "min_amount should match input min_amount",
    created.min_amount ?? null,
    createBody.min_amount ?? null,
  );
  TestValidator.equals(
    "max_amount should match input max_amount",
    created.max_amount ?? null,
    createBody.max_amount ?? null,
  );

  TestValidator.predicate(
    "min_amount should be non-negative when present",
    created.min_amount === null || created.min_amount === undefined
      ? true
      : created.min_amount >= 0,
  );
  TestValidator.predicate(
    "max_amount should be non-negative when present",
    created.max_amount === null || created.max_amount === undefined
      ? true
      : created.max_amount >= 0,
  );

  TestValidator.predicate(
    "min_amount should be less than or equal to max_amount when both are present",
    created.min_amount === null ||
      created.min_amount === undefined ||
      created.max_amount === null ||
      created.max_amount === undefined
      ? true
      : created.min_amount <= created.max_amount,
  );

  TestValidator.equals(
    "status should be active as configured",
    created.status,
    createBody.status,
  );
}
