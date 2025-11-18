import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Validate that an authenticated admin can update a shipping method's
 * display_name while keeping its business key (method_code) stable and that the
 * change is visible through the public shipping method read API.
 *
 * Business flow:
 *
 * 1. Register an admin with POST /auth/admin/join.
 * 2. As that admin, create a shipping method via POST
 *    /shoppingMall/admin/shippingMethods.
 * 3. Update the shipping method's display_name using PUT
 *    /shoppingMall/admin/shippingMethods/{methodCode}, without touching
 *    service_level_description so the existing value remains.
 * 4. Verify the update response keeps method_code and created_at stable while
 *    updating display_name and updated_at.
 * 5. Read the shipping method via GET /shoppingMall/shippingMethods/{methodCode}
 *    and ensure the updated display_name is persisted for public consumers.
 */
export async function test_api_admin_shipping_method_update_basic(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create initial shipping method as admin
  const baseMethodCode = "standard";
  const uniqueSuffix = RandomGenerator.alphaNumeric(8);
  const methodCode = `${baseMethodCode}-${uniqueSuffix}`;

  const createBody = {
    method_code: methodCode,
    display_name: "Standard Shipping",
    service_level_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const created: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  TestValidator.equals(
    "created shipping method uses requested method_code",
    created.method_code,
    methodCode,
  );

  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 3. Update only the display_name using PUT, keeping method_code stable
  const updatedDisplayName = "Standard Shipping (Updated)";

  const updateBody = {
    display_name: updatedDisplayName,
  } satisfies IShoppingMallShippingMethod.IUpdate;

  const updated: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.update(connection, {
      methodCode: created.method_code,
      body: updateBody,
    });
  typia.assert(updated);

  // method_code must remain unchanged
  TestValidator.equals(
    "updated shipping method keeps method_code stable",
    updated.method_code,
    created.method_code,
  );

  // display_name must be updated
  TestValidator.equals(
    "updated shipping method has new display_name",
    updated.display_name,
    updatedDisplayName,
  );

  // created_at must remain the same
  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  // updated_at must change and be not earlier than created_at
  TestValidator.notEquals(
    "updated_at changes after update",
    updated.updated_at,
    originalUpdatedAt,
  );

  TestValidator.predicate("updated_at is not earlier than created_at", () => {
    const createdTime = Date.parse(originalCreatedAt);
    const updatedTime = Date.parse(updated.updated_at);
    return (
      !Number.isNaN(createdTime) &&
      !Number.isNaN(updatedTime) &&
      updatedTime >= createdTime
    );
  });

  // 4. Public read verification via GET /shoppingMall/shippingMethods/{methodCode}
  const read: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.shippingMethods.at(connection, {
      methodCode: created.method_code,
    });
  typia.assert(read);

  TestValidator.equals(
    "public read uses same method_code",
    read.method_code,
    created.method_code,
  );

  TestValidator.equals(
    "public read reflects updated display_name",
    read.display_name,
    updatedDisplayName,
  );

  TestValidator.equals(
    "public read created_at matches updated entity",
    read.created_at,
    updated.created_at,
  );

  TestValidator.equals(
    "public read updated_at matches updated entity",
    read.updated_at,
    updated.updated_at,
  );
}
