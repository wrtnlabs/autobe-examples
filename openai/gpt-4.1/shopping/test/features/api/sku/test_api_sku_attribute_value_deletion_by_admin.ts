import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";

/**
 * Validate that an authenticated admin user is able to directly delete any SKU
 * attribute value mapping for catalog management.
 *
 * - Admin registers via /auth/admin/join, thereby acquiring platform privileges
 *   and authentication.
 * - Using the admin session, a DELETE operation is performed on
 *   /shoppingMall/admin/skus/{skuId}/attributeValues/{attributeValueId}.
 * - As this is a catalog-wide privilege feature, the test generates random valid
 *   UUIDs to represent potential mappings under management scope.
 * - Success is defined by the operation returning the deleted
 *   IShoppingMallProductAttributeValue and proper type assertion passes.
 *
 * Steps:
 *
 * 1. Register a new platform admin to obtain authentication.
 * 2. (Assumption: Attribute value mapping exists) Generate random UUIDs for skuId
 *    and attributeValueId for the deletion attempt.
 * 3. Admin deletes the attribute value mapping via the API.
 * 4. Validate the returned data and structure.
 */
export async function test_api_sku_attribute_value_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin to get credentials
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Generate random UUIDs for SKU and attributeValueID (simulate attribute mapping in catalog)
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const attributeValueId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt deletion of mapping as admin
  const deleted: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.admin.skus.attributeValues.erase(
      connection,
      {
        skuId,
        attributeValueId,
      },
    );
  typia.assert(deleted);

  // 4. Validate returned structure -- just deep type check
  TestValidator.predicate(
    "returned id matches attributeValueId",
    deleted.id === attributeValueId,
  );
  TestValidator.predicate(
    "returned skuId matches input",
    deleted.shopping_mall_product_sku_id === skuId,
  );
}
