import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Testing the deletion of SKU attribute value by admin user.
 *
 * 1. Register an admin user with realistic data.
 * 2. Authenticate as the admin user.
 * 3. Generate a random UUID to simulate an existing SKU attribute value ID.
 * 4. Call the SKU attribute value deletion API endpoint.
 * 5. Validate that the API call successfully completes with no returned data.
 * 6. (Optional) Attempt to delete with an unauthenticated or unauthorized user to
 *    ensure access control (If possible).
 */
export async function test_api_shoppingmall_sku_attribute_value_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    name: "Admin User",
    password: "SecurePass123!",
    phone_number: null,
    role: "superadmin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a random SKU attribute value ID (UUID)
  const skuAttributeValueId = typia.random<string & tags.Format<"uuid">>();

  // 3. Delete the SKU attribute value by ID
  await api.functional.shoppingMall.admin.shoppingMallSkuAttributeValues.erase(
    connection,
    {
      id: skuAttributeValueId,
    },
  );

  // 4. Since no response, typia.assert cannot validate result; call success is enough
  // 5. Additional access control and error tests could be written if more endpoints existed
}
