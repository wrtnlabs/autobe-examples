import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Validate that an admin can clear nullable optional fields on a payment method
 * by sending explicit nulls in update payload, while unspecified fields remain
 * unchanged.
 *
 * Business flow:
 *
 * 1. Admin joins the platform (POST /auth/admin/join) to obtain an auth token.
 * 2. Admin creates a payment method with non-null optional fields (description,
 *    allowed_currencies, allowed_countries, min_amount, max_amount).
 * 3. Admin updates the payment method by its business code, sending an
 *    IShoppingMallPaymentMethod.IUpdate payload where some optional fields are
 *    explicitly set to null, and other fields are omitted.
 * 4. Verify from the update response that:
 *
 *    - Explicitly nullified fields are now null.
 *    - Omitted fields (display_name, provider_type, status, min_amount, max_amount)
 *         remain unchanged from the original record.
 *    - Id and code remain stable between create and update.
 */
export async function test_api_admin_payment_method_update_optional_fields_to_null(
  connection: api.IConnection,
) {
  // 1. Admin joins the platform to obtain authorization
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a payment method with non-null optional fields
  const createBody = {
    code: `pm_${RandomGenerator.alphaNumeric(10)}`,
    display_name: "Credit Card via TestGateway",
    description: "Primary credit card processor for test environment",
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

  // Sanity checks on created entity
  TestValidator.equals(
    "created code should match request code",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created display_name should match request display_name",
    created.display_name,
    createBody.display_name,
  );
  TestValidator.equals(
    "created provider_type should match request provider_type",
    created.provider_type,
    createBody.provider_type,
  );
  TestValidator.equals(
    "created status should match request status",
    created.status,
    createBody.status,
  );

  // 3. Update payment method: explicit nulls for some optionals, omit others
  const updateBody = {
    description: null,
    allowed_currencies: null,
    allowed_countries: null,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updated: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.update(connection, {
      paymentMethodCode: created.code,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Assertions: nullified vs unchanged fields

  // Identity stability
  TestValidator.equals(
    "payment method id should remain unchanged after update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "payment method code should remain unchanged after update",
    updated.code,
    created.code,
  );

  // Explicitly cleared optional fields must be exactly null
  TestValidator.equals(
    "description should be cleared to null by update",
    updated.description,
    null,
  );
  TestValidator.equals(
    "allowed_currencies should be cleared to null by update",
    updated.allowed_currencies,
    null,
  );
  TestValidator.equals(
    "allowed_countries should be cleared to null by update",
    updated.allowed_countries,
    null,
  );

  // Unchanged fields (not provided in update payload)
  TestValidator.equals(
    "display_name should remain unchanged when not updated",
    updated.display_name,
    created.display_name,
  );
  TestValidator.equals(
    "provider_type should remain unchanged when not updated",
    updated.provider_type,
    created.provider_type,
  );
  TestValidator.equals(
    "status should remain unchanged when not updated",
    updated.status,
    created.status,
  );
  TestValidator.equals(
    "min_amount should remain unchanged when not updated",
    updated.min_amount,
    created.min_amount,
  );
  TestValidator.equals(
    "max_amount should remain unchanged when not updated",
    updated.max_amount,
    created.max_amount,
  );
}
