import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Validate that an authenticated admin can create a shipping method with an
 * optional service-level description and that auditing timestamps are set
 * consistently.
 *
 * Business context: Administrative staff configure shipping methods that are
 * referenced by checkout and fulfillment flows. A shipping method has a stable
 * machine-readable method_code, a user-facing display_name, and an optional
 * service_level_description that documents expectations such as delivery
 * windows. When a method is created, created_at and updated_at should be
 * populated by the backend.
 *
 * Test steps:
 *
 * 1. Register an admin via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate. This implicitly authenticates the
 *    connection and configures Authorization headers through the SDK.
 * 2. Call POST /shoppingMall/admin/shippingMethods with an
 *    IShoppingMallShippingMethod.ICreate body that includes:
 *
 *    - Method_code: a deterministic test code (e.g., "next_day_air"),
 *    - Display_name: "Next-Day Air Shipping",
 *    - Service_level_description: a descriptive sentence.
 * 3. Assert that the response type conforms to IShoppingMallShippingMethod via
 *    typia.assert.
 * 4. Assert business fields using TestValidator:
 *
 *    - Method_code matches the requested value,
 *    - Display_name matches the requested value,
 *    - Service_level_description matches the requested description.
 * 5. Verify created_at and updated_at:
 *
 *    - Both are non-empty strings,
 *    - Updated_at is greater than or equal to created_at when parsed as Date
 *         objects.
 */
export async function test_api_admin_shipping_method_creation_with_optional_description(
  connection: api.IConnection,
) {
  // 1. Register an admin (auth join) to obtain admin context.
  const adminJoinBody = {
    email: "admin+shipping@test.example.com",
    password: "AdminPassw0rd!",
    href: "https://admin.test.example.com/join",
    referrer: "https://admin.test.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a shipping method with optional description.
  const methodCode = "next_day_air";
  const displayName = "Next-Day Air Shipping";
  const description =
    "Delivered by next business day for domestic orders placed before cutoff.";

  const createBody = {
    method_code: methodCode,
    display_name: displayName,
    service_level_description: description,
  } satisfies IShoppingMallShippingMethod.ICreate;

  const created =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallShippingMethod>(created);

  // 3. Business field validations.
  TestValidator.equals(
    "shipping method_code matches request payload",
    created.method_code,
    methodCode,
  );
  TestValidator.equals(
    "shipping display_name matches request payload",
    created.display_name,
    displayName,
  );
  TestValidator.equals(
    "shipping service_level_description matches request payload",
    created.service_level_description,
    description,
  );

  // 4. Timestamp validations.
  TestValidator.predicate(
    "created_at should be a non-empty string",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    created.updated_at.length > 0,
  );

  const createdAtMs = new Date(created.created_at).getTime();
  const updatedAtMs = new Date(created.updated_at).getTime();

  TestValidator.predicate(
    "created_at should be a valid date",
    Number.isFinite(createdAtMs),
  );
  TestValidator.predicate(
    "updated_at should be a valid date",
    Number.isFinite(updatedAtMs),
  );
  TestValidator.predicate(
    "updated_at should not be earlier than created_at",
    updatedAtMs >= createdAtMs,
  );
}
