import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can update an existing brand.
 *
 * Business workflow covered by this test:
 *
 * 1. Register (join) as a new platform admin to obtain an authorized session.
 * 2. Create a new brand in the shoppingMall catalog as that admin.
 * 3. Update the brand using the platformAdmin brand update endpoint.
 * 4. Confirm that mutable fields change as requested and system-managed fields
 *    (id, created_at, updated_at, deleted_at) behave correctly.
 */
export async function test_api_brand_update_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized context
  const adminJoinRequest =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Create initial brand
  const createBrandBody = typia.random<IShoppingMallBrand.ICreate>();

  const createdBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: createBrandBody,
    });
  typia.assert(createdBrand);

  // 3. Prepare deterministic update payload for the brand
  const updatedName =
    createBrandBody.name + "-updated-" + RandomGenerator.alphaNumeric(8);
  const updatedSlug =
    createBrandBody.slug + "-updated-" + RandomGenerator.alphaNumeric(6);

  const updatedDescription =
    (createBrandBody.description ??
      RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      })) + " | mutated";

  // Ensure logo_uri always has the correct tagged URI type
  const updatedLogoUri =
    createBrandBody.logo_uri ?? typia.random<string & tags.Format<"uri">>();

  const updateBrandBody = {
    name: updatedName,
    slug: updatedSlug,
    description: updatedDescription,
    logo_uri: updatedLogoUri,
  } satisfies IShoppingMallBrand.IUpdate;

  // 4. Call update endpoint
  const updatedBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.update(connection, {
      brandId: createdBrand.id,
      body: updateBrandBody,
    });
  typia.assert(updatedBrand);

  // 5. Validate system-managed and mutable fields
  // Identity must stay the same
  TestValidator.equals(
    "updated brand should keep same id as created brand",
    updatedBrand.id,
    createdBrand.id,
  );

  // Mutable fields should reflect new values
  TestValidator.equals(
    "updated brand name should match requested new name",
    updatedBrand.name,
    updatedName,
  );
  TestValidator.equals(
    "updated brand slug should match requested new slug",
    updatedBrand.slug,
    updatedSlug,
  );
  TestValidator.equals(
    "updated brand description should match requested new description",
    updatedBrand.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated brand logo_uri should match requested new logo_uri",
    updatedBrand.logo_uri,
    updatedLogoUri,
  );

  // Ensure mutable fields actually changed from the original
  TestValidator.notEquals(
    "brand name should be changed after update",
    updatedBrand.name,
    createdBrand.name,
  );
  TestValidator.notEquals(
    "brand slug should be changed after update",
    updatedBrand.slug,
    createdBrand.slug,
  );

  // created_at must remain unchanged
  TestValidator.equals(
    "created_at should remain unchanged after brand update",
    updatedBrand.created_at,
    createdBrand.created_at,
  );

  // updated_at should change
  TestValidator.notEquals(
    "updated_at should change after brand update",
    updatedBrand.updated_at,
    createdBrand.updated_at,
  );

  // deleted_at should not be altered by a normal update
  TestValidator.equals(
    "deleted_at should remain unchanged by brand update",
    updatedBrand.deleted_at,
    createdBrand.deleted_at,
  );
}
