import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Validate successful deletion of a shopping mall shipping method configuration
 * by an authenticated admin.
 *
 * Business flow:
 *
 * 1. Register a new admin via POST /auth/admin/join, which also authenticates the
 *    admin and sets the access token on the connection.
 * 2. As this admin, create a shipping method via POST
 *    /shoppingMall/admin/shippingMethods with a unique method_code and
 *    descriptive fields.
 * 3. Verify that the created shipping method echoes back the requested
 *    configuration (method_code and display_name).
 * 4. Call DELETE /shoppingMall/admin/shippingMethods/{methodCode} using the
 *    method_code from the created record.
 * 5. Assert that the delete call completes successfully (no HttpError thrown).
 *    Since no GET endpoint is available, we rely on successful completion as
 *    our verification of deletion.
 */
export async function test_api_admin_shipping_method_delete_success_flow(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a shipping method to be deleted
  const methodCode = `standard-${RandomGenerator.alphaNumeric(8)}`;
  const shippingMethodCreateBody = {
    method_code: methodCode,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    service_level_description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const createdMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(createdMethod);

  // Basic business validations on the created record
  TestValidator.equals(
    "created method_code matches input",
    createdMethod.method_code,
    shippingMethodCreateBody.method_code,
  );
  TestValidator.equals(
    "created display_name matches input",
    createdMethod.display_name,
    shippingMethodCreateBody.display_name,
  );

  // 3. Delete the shipping method by method_code
  await api.functional.shoppingMall.admin.shippingMethods.erase(connection, {
    methodCode: createdMethod.method_code,
  });

  // If we reached here without HttpError, deletion succeeded in the success flow.
  TestValidator.predicate(
    "shipping method deletion call completed without throwing",
    true,
  );
}
