import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Validate basic mutable-field update behavior for admin payment methods.
 *
 * Business goal: Ensure that an authenticated admin can update only mutable
 * fields of an existing payment method, identified by its business code, and
 * that immutable identifiers remain unchanged while updated_at reflects the
 * modification.
 *
 * High-level steps:
 *
 * 1. Admin registration & authentication via POST /auth/admin/join.
 * 2. Baseline payment method creation via POST /shoppingMall/admin/paymentMethods.
 * 3. Update the payment method by business code via PUT
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}.
 * 4. Validate that only specified fields changed and timestamps reflect the
 *    update.
 */
export async function test_api_admin_payment_method_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create baseline payment method
  const baseCode = "card_update_test";

  const createBody = {
    code: baseCode,
    display_name: "Card Old",
    description: null,
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 1000,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  TestValidator.equals(
    "created payment method code matches input code",
    created.code,
    baseCode,
  );
  TestValidator.equals(
    "created payment method status is active",
    created.status,
    "active",
  );

  const originalId = created.id;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 3. Update mutable fields using business code
  const updateBody = {
    display_name: "Card New",
    description: "Updated description for card payment method",
    status: "disabled",
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updated: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.update(connection, {
      paymentMethodCode: baseCode,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Validate immutable fields unchanged
  TestValidator.equals(
    "payment method id remains immutable after update",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "payment method code remains immutable after update",
    updated.code,
    baseCode,
  );

  // 5. Validate updated fields
  TestValidator.equals(
    "display_name is updated to new value",
    updated.display_name,
    "Card New",
  );
  TestValidator.equals(
    "description is updated from null to non-null string",
    updated.description,
    "Updated description for card payment method",
  );
  TestValidator.equals(
    "status is updated from active to disabled",
    updated.status,
    "disabled",
  );

  // 6. Validate unchanged fields still equal original
  TestValidator.equals(
    "provider_type remains unchanged",
    updated.provider_type,
    created.provider_type,
  );
  TestValidator.equals(
    "allowed_currencies remains unchanged",
    updated.allowed_currencies,
    created.allowed_currencies,
  );
  TestValidator.equals(
    "allowed_countries remains unchanged",
    updated.allowed_countries,
    created.allowed_countries,
  );
  TestValidator.equals(
    "min_amount remains unchanged",
    updated.min_amount,
    created.min_amount,
  );
  TestValidator.equals(
    "max_amount remains unchanged",
    updated.max_amount,
    created.max_amount,
  );

  // 7. Validate updated_at is greater than created_at and has changed
  TestValidator.predicate(
    "updated_at is later than or equal to created_at",
    new Date(updated.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
  TestValidator.predicate(
    "updated_at has changed from original value",
    updated.updated_at !== originalUpdatedAt,
  );

  // 8. Optional second partial update: only change display_name again
  const secondUpdateBody = {
    display_name: "Card Newer",
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updatedAgain: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.update(connection, {
      paymentMethodCode: baseCode,
      body: secondUpdateBody,
    });
  typia.assert(updatedAgain);

  TestValidator.equals(
    "display_name reflects second update",
    updatedAgain.display_name,
    "Card Newer",
  );
  TestValidator.equals(
    "description remains from first update when omitted in second",
    updatedAgain.description,
    updated.description,
  );
  TestValidator.equals(
    "status remains from first update when omitted in second",
    updatedAgain.status,
    updated.status,
  );
}
