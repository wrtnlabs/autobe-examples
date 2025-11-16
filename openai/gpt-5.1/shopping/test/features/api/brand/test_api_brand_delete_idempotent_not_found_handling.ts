import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate idempotent delete behavior and not-found handling for brand
 * deletion.
 *
 * ## Business goal
 *
 * Ensure that platform administrators experience deterministic, safe behavior
 * when attempting to delete brands in the shopping mall catalog, including:
 *
 * - Successful deletion of an existing brand.
 * - Predictable error behavior when deleting a non-existent brand ID.
 * - Idempotent semantics when a brand is deleted multiple times.
 *
 * ## Covered scenarios
 *
 * 1. Platform admin registration & authentication
 *
 *    - Register a new platform admin via POST /auth/platformAdmin/join.
 *    - Rely on the SDK to attach the issued JWT access token to the connection.
 * 2. Deleting a random, non-existent brand
 *
 *    - Generate a random UUID to represent a brandId that has never been created in
 *         this test run.
 *    - Call DELETE /shoppingMall/platformAdmin/brands/{brandId} using
 *         api.functional.shoppingMall.platformAdmin.brands.erase.
 *    - Wrap the call in TestValidator.error to assert that the operation fails in a
 *         controlled way (some HttpError is thrown).
 *    - This verifies that the API handles missing brands deterministically and does
 *         not accidentally succeed or mutate state.
 * 3. Deleting an existing brand twice (idempotency pattern)
 *
 *    - Create a brand via POST /shoppingMall/platformAdmin/brands using
 *         api.functional.shoppingMall.platformAdmin.brands.create and a valid
 *         IShoppingMallBrand.ICreate payload.
 *    - Assert the response via typia.assert and capture the created brandId.
 *    - First delete:
 *
 *         - Call erase with the created id and expect it to succeed (no error, no
 *                   TestValidator.error wrapper).
 *    - Second delete:
 *
 *         - Call erase again with the same id, this time wrapped in TestValidator.error
 *                   to assert that it now fails in the same way as a
 *                   non-existent brand, demonstrating idempotent semantics from
 *                   the client perspective.
 * 4. Observability and invariants
 *
 *    - Use TestValidator.predicate to enforce basic invariants, such as:
 *
 *         - The created brand id is a non-empty string.
 *         - The random non-existent UUID is different from the created brand id.
 *    - Use TestValidator.equals where appropriate to compare identifiers and ensure
 *         we are consistently operating on the intended brand.
 *    - We do not validate specific HTTP status codes or error payloads; we only
 *         assert success vs failure semantics using TestValidator.error.
 */
export async function test_api_brand_delete_idempotent_not_found_handling(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain an authorized connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Scenario A: delete a random non-existent brand
  const nonExistentBrandId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "erase should fail for non-existent brand id",
    async () => {
      await api.functional.shoppingMall.platformAdmin.brands.erase(connection, {
        brandId: nonExistentBrandId,
      });
    },
  );

  // 3. Scenario B: create a brand, delete once successfully, then delete again
  const createBrandBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shoppingmall.test/assets/brands/" +
      RandomGenerator.alphaNumeric(12) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const createdBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: createBrandBody,
    });
  typia.assert<IShoppingMallBrand>(createdBrand);

  TestValidator.predicate(
    "created brand id should be non-empty",
    createdBrand.id.length > 0,
  );

  TestValidator.predicate(
    "non-existent brand id should differ from created brand id",
    nonExistentBrandId !== createdBrand.id,
  );

  // First delete: should succeed without throwing
  await api.functional.shoppingMall.platformAdmin.brands.erase(connection, {
    brandId: createdBrand.id,
  });

  // Second delete: should now behave like deleting a non-existent brand
  await TestValidator.error(
    "second erase on same brand id should fail like non-existent brand",
    async () => {
      await api.functional.shoppingMall.platformAdmin.brands.erase(connection, {
        brandId: createdBrand.id,
      });
    },
  );
}
