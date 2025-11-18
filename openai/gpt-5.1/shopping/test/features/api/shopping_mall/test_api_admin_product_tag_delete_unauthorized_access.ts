import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

/**
 * Ensure that unauthorized clients cannot delete admin-managed product tags.
 *
 * This test focuses on access control for the DELETE
 * /shoppingMall/admin/productTags/{productTagId} endpoint, validating that only
 * properly authenticated admin actors can perform deletions.
 *
 * Business context:
 *
 * - Product tags are part of the ShoppingMall catalog taxonomy and are managed
 *   exclusively by administrators.
 * - Deleting a tag should therefore be restricted to authenticated admin
 *   sessions; anonymous clients must not be able to call this endpoint
 *   successfully.
 * - The SDK automatically wires admin join to issue a JWT and store it in the
 *   connection headers, so we can simulate both authorized and unauthorized
 *   contexts by controlling which connection object we use.
 *
 * Steps:
 *
 * 1. Admin bootstrap and tag creation (setup)
 *
 *    - Use api.functional.auth.admin.join to register a new admin and obtain an
 *         authenticated connection (via the same connection object whose
 *         headers are mutated inside join).
 *    - Use api.functional.shoppingMall.admin.productTags.create with a valid
 *         IShoppingMallProductTag.ICreate body to create a tag.
 *    - Assert that the returned IShoppingMallProductTag matches its schema.
 * 2. Anonymous delete attempt
 *
 *    - Derive an unauthenticated connection by shallow-cloning the original
 *         connection but forcing headers to an empty object `{}` so that there
 *         is no Authorization header at all.
 *    - Call api.functional.shoppingMall.admin.productTags.erase with this
 *         unauthenticated connection and the previously created tag id.
 *    - Wrap the call with TestValidator.error to assert that an error is thrown,
 *         without coupling to a specific HTTP status code.
 * 3. Sanity check: authorized delete still works (best-effort)
 *
 *    - Finally, as a sanity check, call erase again using the admin-authenticated
 *         connection to ensure that the same endpoint works when proper
 *         credentials are present.
 *    - Because erase returns void and we do not have a read/list endpoint in the
 *         provided SDK to verify physical deletion, we just assert that the
 *         call completes without throwing.
 */
export async function test_api_admin_product_tag_delete_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap and tag creation
  const adminJoinInput = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const createdTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: typia.random<IShoppingMallProductTag.ICreate>(),
    });
  typia.assert<IShoppingMallProductTag>(createdTag);

  // 2. Anonymous delete attempt
  const anonymousConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "anonymous client cannot delete admin product tag",
    async () => {
      await api.functional.shoppingMall.admin.productTags.erase(
        anonymousConnection,
        {
          productTagId: createdTag.id,
        },
      );
    },
  );

  // 3. Sanity check: authorized delete works with admin context
  await api.functional.shoppingMall.admin.productTags.erase(connection, {
    productTagId: createdTag.id,
  });
}
