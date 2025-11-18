import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Validate that an authenticated admin can create a basic shipping method
 * configuration and that it becomes publicly readable by method_code.
 *
 * Business context:
 *
 * - Shipping methods are created by administrators via admin-only endpoint POST
 *   /shoppingMall/admin/shippingMethods using
 *   IShoppingMallShippingMethod.ICreate.
 * - Once created, shipping methods are consumed by public flows using GET
 *   /shoppingMall/shippingMethods/{methodCode} without authentication.
 *
 * Steps:
 *
 * 1. Register (join) a new admin using POST /auth/admin/join to obtain
 *    IShoppingMallAdmin.IAuthorized and let the SDK attach the access token to
 *    the connection headers.
 * 2. As this admin, call POST /shoppingMall/admin/shippingMethods with the minimal
 *    required body: method_code and display_name, omitting
 *    service_level_description.
 * 3. Assert that the create response matches IShoppingMallShippingMethod, and that
 *    core business fields echo the input values.
 * 4. Call GET /shoppingMall/shippingMethods/{methodCode} using the method_code
 *    from step 2 and assert that the returned configuration matches the record
 *    created in step 2 (id, method_code, display_name, timestamps).
 */
export async function test_api_admin_shipping_method_creation_basic(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new shipping method with minimal required fields
  const methodCode = `express_${RandomGenerator.alphaNumeric(8)}`;
  const displayName = RandomGenerator.paragraph({ sentences: 2 });

  const createBody = {
    method_code: methodCode,
    display_name: displayName,
  } satisfies IShoppingMallShippingMethod.ICreate;

  const created: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallShippingMethod>(created);

  // Business validations on the created record
  TestValidator.equals(
    "created shipping method_code should match request",
    created.method_code,
    methodCode,
  );
  TestValidator.equals(
    "created shipping display_name should match request",
    created.display_name,
    displayName,
  );

  // service_level_description is optional; when omitted, it should be either
  // null or undefined. We assert it has not been set to a non-null arbitrary
  // value by defaulting logic when not expected.
  TestValidator.predicate(
    "service_level_description should be null or undefined when omitted",
    created.service_level_description === null ||
      created.service_level_description === undefined,
  );

  // 3. Publicly retrieve the shipping method by method_code
  const fetched: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.shippingMethods.at(connection, {
      methodCode,
    });
  typia.assert<IShoppingMallShippingMethod>(fetched);

  // Verify the fetched record matches the created one for key fields
  TestValidator.equals(
    "fetched shipping method id matches created id",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "fetched shipping method_code matches created method_code",
    fetched.method_code,
    created.method_code,
  );
  TestValidator.equals(
    "fetched shipping display_name matches created display_name",
    fetched.display_name,
    created.display_name,
  );
  TestValidator.equals(
    "fetched created_at timestamp matches created.created_at",
    fetched.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "fetched updated_at timestamp matches created.updated_at",
    fetched.updated_at,
    created.updated_at,
  );
}
