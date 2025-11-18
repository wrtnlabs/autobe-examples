import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Validate that an admin can add or change the optional
 * service_level_description of an existing shipping method without altering
 * other fields, and that the change is visible via the public read endpoint.
 *
 * Scenario steps:
 *
 * 1. Join as an admin (POST /auth/admin/join) to obtain an authenticated admin
 *    session.
 * 2. Create a shipping method via POST /shoppingMall/admin/shippingMethods with
 *    IShoppingMallShippingMethod.ICreate, with service_level_description
 *    initially omitted so it is null/undefined on the stored entity.
 * 3. Update the shipping method via PUT
 *    /shoppingMall/admin/shippingMethods/{methodCode} with
 *    IShoppingMallShippingMethod.IUpdate, setting service_level_description to
 *    a non-null, human-readable description while omitting display_name so it
 *    remains unchanged.
 * 4. Assert on the update response that:
 *
 *    - It is a valid IShoppingMallShippingMethod (typia.assert).
 *    - Method_code is unchanged.
 *    - Display_name is unchanged.
 *    - Service_level_description equals the new value.
 *    - Updated_at is strictly later than created_at.
 * 5. Fetch the same method via GET /shoppingMall/shippingMethods/{methodCode} and
 *    assert that:
 *
 *    - The response is valid.
 *    - Display_name matches the original value.
 *    - Service_level_description matches the updated description (persistence +
 *         read-model check).
 */
export async function test_api_admin_shipping_method_update_add_description(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a shipping method with no initial service_level_description
  const methodCode = `method-${RandomGenerator.alphaNumeric(8)}`;
  const displayName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });

  const createBody = {
    method_code: methodCode,
    display_name: displayName,
    // Omit service_level_description so that it is initially null/undefined
  } satisfies IShoppingMallShippingMethod.ICreate;

  const created: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  TestValidator.equals(
    "created.method_code should equal input method_code",
    created.method_code,
    methodCode,
  );
  TestValidator.equals(
    "created.display_name should equal input display_name",
    created.display_name,
    displayName,
  );
  TestValidator.equals(
    "created.service_level_description should initially be null or undefined",
    created.service_level_description ?? null,
    null,
  );

  // 3. Update only the service_level_description via admin update endpoint
  const newDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });

  const updateBody = {
    service_level_description: newDescription,
    // display_name intentionally omitted to preserve existing value
  } satisfies IShoppingMallShippingMethod.IUpdate;

  const updated: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.update(connection, {
      methodCode,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Validate update response invariants and field changes
  TestValidator.equals(
    "updated.method_code should remain unchanged",
    updated.method_code,
    created.method_code,
  );
  TestValidator.equals(
    "updated.display_name should remain unchanged when omitted in IUpdate",
    updated.display_name,
    created.display_name,
  );
  TestValidator.equals(
    "updated.service_level_description should equal newDescription",
    updated.service_level_description,
    newDescription,
  );

  // Ensure updated_at is strictly later than created_at
  const createdAt = new Date(created.created_at).getTime();
  const updatedAt = new Date(updated.updated_at).getTime();
  TestValidator.predicate(
    "updated.updated_at must be later than created.created_at",
    updatedAt > createdAt,
  );

  // 5. Read via public GET /shoppingMall/shippingMethods/{methodCode}
  const reloaded: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.shippingMethods.at(connection, {
      methodCode,
    });
  typia.assert(reloaded);

  TestValidator.equals(
    "public read display_name should match original display_name",
    reloaded.display_name,
    displayName,
  );
  TestValidator.equals(
    "public read service_level_description should match updated description",
    reloaded.service_level_description,
    newDescription,
  );
}
