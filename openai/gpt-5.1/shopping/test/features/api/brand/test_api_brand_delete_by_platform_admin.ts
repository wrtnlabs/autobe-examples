import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can delete a brand they have created.
 *
 * Business workflow covered by this E2E test:
 *
 * 1. Register and authenticate a new platform administrator using POST
 *    /auth/platformAdmin/join. This call both creates the admin identity and
 *    installs the JWT access token into the shared SDK connection so that
 *    subsequent calls run under the platformAdmin actor.
 * 2. With the authenticated admin, create a new brand via POST
 *    /shoppingMall/platformAdmin/brands using an IShoppingMallBrand.ICreate
 *    payload. Capture the returned IShoppingMallBrand, especially its `id`.
 * 3. Call DELETE /shoppingMall/platformAdmin/brands/{brandId} through
 *    api.functional.shoppingMall.platformAdmin.brands.erase with the captured
 *    brand id.
 * 4. Assert that the delete operation completes successfully (no exception thrown)
 *    and returns `void` (no response body).
 * 5. Optionally, invoke a second delete on the same brand id and validate that
 *    some error occurs, confirming that the first delete had effect. We do not
 *    assert specific HTTP status codes, only that the second attempt fails.
 *
 * This test focuses on the happy-path authorization and lifecycle of a brand
 * record from creation to deletion, ensuring that:
 *
 * - Join is sufficient to obtain platformAdmin privileges
 * - A valid brand can be created and receives a UUID id
 * - The erase endpoint accepts that id and completes without response content
 */
export async function test_api_brand_delete_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "platform admin session is active",
    admin.isActive === true,
  );

  // 2. Create a new brand under this admin
  const createBody = typia.random<IShoppingMallBrand.ICreate>();
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: createBody,
    });
  typia.assert(brand);

  TestValidator.equals(
    "created brand name matches input",
    brand.name,
    createBody.name,
  );
  TestValidator.equals(
    "created brand slug matches input",
    brand.slug,
    createBody.slug,
  );

  // 3. Delete the brand by its identifier
  await api.functional.shoppingMall.platformAdmin.brands.erase(connection, {
    brandId: brand.id,
  });

  // 4. Deletion returns void; ensure no exception has been thrown up to here.

  // 5. Optional: verify that a second deletion attempt fails, proving that the
  //    first deletion had effect. We only assert that some error is thrown,
  //    without checking concrete HTTP status codes.
  await TestValidator.error(
    "second delete on same brand must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.brands.erase(connection, {
        brandId: brand.id,
      });
    },
  );
}
