import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Validate that a shipping method created by an admin can be retrieved publicly
 * by its business method_code with consistent data.
 *
 * Business flow:
 *
 * 1. Register a new admin using POST /auth/admin/join and obtain an authenticated
 *    admin context (token is attached automatically by the SDK to the provided
 *    connection).
 * 2. As the admin, create a new shipping method via POST
 *    /shoppingMall/admin/shippingMethods using a deterministic
 *    IShoppingMallShippingMethod.ICreate payload including method_code and
 *    display_name (and an optional service_level_description).
 * 3. Call GET /shoppingMall/shippingMethods/{methodCode} with the same method_code
 *    to retrieve the shipping method publicly.
 * 4. Verify that the retrieved IShoppingMallShippingMethod matches the created
 *    configuration and that the id is consistent between creation and
 *    retrieval.
 */
export async function test_api_shipping_method_get_by_code_after_creation(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // For join, ip is optional and can be omitted; href and referrer are required
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new shipping method as the authenticated admin
  const methodCode = `test-method-${RandomGenerator.alphaNumeric(8)}`;
  const displayName = "Test Shipping Method";
  const serviceLevelDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });

  const createBody = {
    method_code: methodCode,
    display_name: displayName,
    service_level_description: serviceLevelDescription,
  } satisfies IShoppingMallShippingMethod.ICreate;

  const createdMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallShippingMethod>(createdMethod);

  // 3. Publicly retrieve the shipping method by its methodCode
  const fetchedMethod = await api.functional.shoppingMall.shippingMethods.at(
    connection,
    {
      methodCode,
    },
  );
  typia.assert<IShoppingMallShippingMethod>(fetchedMethod);

  // 4. Validate identity consistency (id) and field equality
  TestValidator.equals(
    "shipping method id must be consistent between creation and retrieval",
    fetchedMethod.id,
    createdMethod.id,
  );

  TestValidator.equals(
    "method_code must match between created and fetched shipping method",
    fetchedMethod.method_code,
    methodCode,
  );

  TestValidator.equals(
    "display_name must match between created and fetched shipping method",
    fetchedMethod.display_name,
    displayName,
  );

  TestValidator.equals(
    "service_level_description must match between created and fetched shipping method",
    fetchedMethod.service_level_description,
    serviceLevelDescription,
  );

  // 5. Basic presence checks for created_at and updated_at relying on typia for format correctness
  TestValidator.predicate(
    "created_at must be a non-empty string in fetched shipping method",
    fetchedMethod.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be a non-empty string in fetched shipping method",
    fetchedMethod.updated_at.length > 0,
  );
}
