import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallSkuOptionValueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionValueAssignment";

/**
 * Validate that a customer cannot retrieve SKU option value assignments for a
 * completely nonexistent product/SKU/assignment, and that the API responds with
 * an error (not-found semantics) without exposing any internal details or
 * creating side effects.
 *
 * Business context:
 *
 * - Customers can inspect SKU option value assignments (like Color: RED, Size: M)
 *   via a customer-facing detail endpoint.
 * - When the customer targets invalid identifiers that do not map to any existing
 *   product, SKU, or option value assignment, the platform should behave like a
 *   generic not-found: it must fail the request without leaking database
 *   internals.
 * - The SDK wraps HTTP errors into exceptions; E2E tests should validate that an
 *   error is thrown instead of a normal DTO.
 *
 * Steps:
 *
 * 1. Register a customer using POST /auth/customer/join to obtain an authenticated
 *    customer connection.
 *
 *    - Build IShoppingMallCustomerAuth.IJoin body with:
 *
 *         - Email: random string in email format.
 *         - Password: simple static string like "password123".
 *         - Name: random human-like name.
 *         - Href, referrer: random URI strings (can use typia.random with
 *                   tags.Format<"uri">).
 *         - Ip: omit or set to null (optional).
 *    - Validate the returned IShoppingMallCustomer.IAuthorized with typia.assert and
 *         rely on the SDK to set Authorization header.
 * 2. Define clearly non-existent identifiers for productCode, skuCode, and
 *    skuOptionValueAssignmentId.
 *
 *    - Use fixed, obviously fake values like "NON_EXISTENT_PRODUCT_CODE",
 *         "NON_EXISTENT_SKU_CODE", and "NON_EXISTENT_ASSIGNMENT_ID" (or longer
 *         alphanumeric strings) that still satisfy the plain string type.
 * 3. As the authenticated customer, invoke:
 *    api.functional.shoppingMall.customer.products.skus.optionValueAssignments.at(connection,
 *    { productCode, skuCode, skuOptionValueAssignmentId, });
 * 4. Wrap the call with TestValidator.error to assert that it throws an error
 *    rather than returning an IShoppingMallSkuOptionValueAssignment.
 *
 *    - Do NOT attempt to verify HTTP status codes, error bodies, or internal fields.
 *    - Only validate that an error is thrown.
 * 5. (Idempotency / no side effects) Call the same endpoint again with the same
 *    invalid identifiers, again expecting an error with TestValidator.error.
 *    This shows repeated requests do not create resources or change system
 *    state in a way that would suddenly make the request succeed.
 */
export async function test_api_customer_sku_option_value_assignment_customer_cannot_access_nonexistent_product(
  connection: api.IConnection,
) {
  // 1. Register a customer and obtain an authenticated connection.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional; we can omit it entirely to let the server infer it.
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // 2. Choose clearly non-existent identifiers.
  const productCode =
    "NON_EXISTENT_PRODUCT_CODE__" + RandomGenerator.alphaNumeric(16);
  const skuCode = "NON_EXISTENT_SKU_CODE__" + RandomGenerator.alphaNumeric(16);
  const skuOptionValueAssignmentId =
    "NON_EXISTENT_ASSIGNMENT_ID__" + RandomGenerator.alphaNumeric(16);

  // 3 & 4. First attempt: expect an error when querying with invalid identifiers.
  await TestValidator.error(
    "customer cannot load assignment for nonexistent product/SKU/assignment (first attempt)",
    async () => {
      await api.functional.shoppingMall.customer.products.skus.optionValueAssignments.at(
        connection,
        {
          productCode,
          skuCode,
          skuOptionValueAssignmentId,
        },
      );
    },
  );

  // 5. Second attempt with the same identifiers to ensure idempotent no-side-effect behavior.
  await TestValidator.error(
    "customer cannot load assignment for nonexistent product/SKU/assignment (second attempt)",
    async () => {
      await api.functional.shoppingMall.customer.products.skus.optionValueAssignments.at(
        connection,
        {
          productCode,
          skuCode,
          skuOptionValueAssignmentId,
        },
      );
    },
  );
}
