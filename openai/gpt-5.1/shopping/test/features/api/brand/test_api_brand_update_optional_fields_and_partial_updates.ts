import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate partial and optional-field updates for ShoppingMall brands.
 *
 * Business goal: Ensure that the platform-admin brand update endpoint (PUT
 * /shoppingMall/platformAdmin/brands/{brandId}) correctly supports partial
 * updates as defined by IShoppingMallBrand.IUpdate, so that administrators can
 * selectively adjust brand metadata (description, logo_uri, name, slug) without
 * having to resubmit the full brand object and without accidentally resetting
 * unspecified fields.
 *
 * Scenario steps:
 *
 * 1. Register a platform administrator with POST /auth/platformAdmin/join.
 *
 *    - Use IShoppingMallPlatformAdminJoin.IRequest payload.
 *    - Rely on SDK behavior to inject Authorization header for subsequent
 *         platformAdmin calls.
 * 2. Create an initial brand via POST /shoppingMall/platformAdmin/brands using
 *    IShoppingMallBrand.ICreate with all writable fields provided (name, slug,
 *    description, logo_uri).
 * 3. Perform a partial update that only changes description, leaving name and slug
 *    unspecified so that they must remain as-is.
 * 4. Verify that:
 *
 *    - Id and created_at are unchanged.
 *    - Name and slug match the original brand.
 *    - Description has been updated.
 *    - Updated_at has changed compared to the original brand.
 * 5. Perform another partial update that only changes logo_uri, leaving
 *    description unspecified so it must retain its last value.
 * 6. Verify that:
 *
 *    - Id and created_at are unchanged.
 *    - Name and slug are still the original values.
 *    - Description remains from step 3.
 *    - Logo_uri has changed compared to step 3.
 *    - Updated_at has changed again and is later than the previous value.
 * 7. Perform a third partial update that "clears" description in a business-safe
 *    way. Since IShoppingMallBrand.IUpdate.description is `string | undefined`
 *    (no null), represent clearing as an empty string rather than null, and
 *    verify it is applied while other fields stay intact.
 * 8. Across all updates, ensure that unspecified fields retain their prior values
 *    and only the explicitly provided fields change.
 */
export async function test_api_brand_update_optional_fields_and_partial_updates(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator so that subsequent
  //    shoppingMall/platformAdmin/* calls are authorized.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a brand with all writable fields populated.
  const initialCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shoppingmall.example.com/logos/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const originalBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: initialCreateBody,
    });
  typia.assert(originalBrand);

  // Sanity checks on server-managed fields.
  TestValidator.predicate(
    "original brand has server-managed timestamps",
    originalBrand.created_at.length > 0 && originalBrand.updated_at.length > 0,
  );

  // 3. First partial update: change only description.
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const firstUpdateBody = {
    description: updatedDescription,
  } satisfies IShoppingMallBrand.IUpdate;

  const brandAfterFirstUpdate: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.update(connection, {
      brandId: originalBrand.id,
      body: firstUpdateBody,
    });
  typia.assert(brandAfterFirstUpdate);

  // 4. Validate first partial update behavior.
  TestValidator.equals(
    "id must remain stable after first update",
    brandAfterFirstUpdate.id,
    originalBrand.id,
  );
  TestValidator.equals(
    "created_at must remain stable after first update",
    brandAfterFirstUpdate.created_at,
    originalBrand.created_at,
  );
  TestValidator.equals(
    "name must remain unchanged when not specified in first update",
    brandAfterFirstUpdate.name,
    originalBrand.name,
  );
  TestValidator.equals(
    "slug must remain unchanged when not specified in first update",
    brandAfterFirstUpdate.slug,
    originalBrand.slug,
  );
  TestValidator.equals(
    "description must be updated in first partial update",
    brandAfterFirstUpdate.description,
    updatedDescription,
  );
  TestValidator.notEquals(
    "updated_at must change after first update",
    brandAfterFirstUpdate.updated_at,
    originalBrand.updated_at,
  );

  // 5. Second partial update: only change logo_uri.
  const secondLogoUri =
    "https://cdn.shoppingmall.example.com/logos/" +
    RandomGenerator.alphaNumeric(16) +
    ".png";
  const secondUpdateBody = {
    logo_uri: secondLogoUri,
  } satisfies IShoppingMallBrand.IUpdate;

  const brandAfterSecondUpdate: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.update(connection, {
      brandId: originalBrand.id,
      body: secondUpdateBody,
    });
  typia.assert(brandAfterSecondUpdate);

  // 6. Validate second partial update behavior.
  TestValidator.equals(
    "id must remain stable after second update",
    brandAfterSecondUpdate.id,
    originalBrand.id,
  );
  TestValidator.equals(
    "created_at must remain stable after second update",
    brandAfterSecondUpdate.created_at,
    originalBrand.created_at,
  );
  TestValidator.equals(
    "name remains original after second update",
    brandAfterSecondUpdate.name,
    originalBrand.name,
  );
  TestValidator.equals(
    "slug remains original after second update",
    brandAfterSecondUpdate.slug,
    originalBrand.slug,
  );
  TestValidator.equals(
    "description remains from first update when not specified in second update",
    brandAfterSecondUpdate.description,
    brandAfterFirstUpdate.description,
  );
  TestValidator.notEquals(
    "logo_uri must change after second update",
    brandAfterSecondUpdate.logo_uri,
    brandAfterFirstUpdate.logo_uri,
  );
  TestValidator.notEquals(
    "updated_at must change again after second update",
    brandAfterSecondUpdate.updated_at,
    brandAfterFirstUpdate.updated_at,
  );

  // 7. Third partial update: clear description by setting it to empty string.
  const thirdUpdateBody = {
    description: "",
  } satisfies IShoppingMallBrand.IUpdate;

  const brandAfterThirdUpdate: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.update(connection, {
      brandId: originalBrand.id,
      body: thirdUpdateBody,
    });
  typia.assert(brandAfterThirdUpdate);

  // 8. Validate third partial update behavior and overall invariants.
  TestValidator.equals(
    "id must remain stable after third update",
    brandAfterThirdUpdate.id,
    originalBrand.id,
  );
  TestValidator.equals(
    "created_at must remain stable after third update",
    brandAfterThirdUpdate.created_at,
    originalBrand.created_at,
  );
  TestValidator.equals(
    "name remains original after third update",
    brandAfterThirdUpdate.name,
    originalBrand.name,
  );
  TestValidator.equals(
    "slug remains original after third update",
    brandAfterThirdUpdate.slug,
    originalBrand.slug,
  );
  TestValidator.equals(
    "logo_uri remains from second update when not specified in third update",
    brandAfterThirdUpdate.logo_uri,
    brandAfterSecondUpdate.logo_uri,
  );
  TestValidator.equals(
    "description is cleared to empty string in third update",
    brandAfterThirdUpdate.description,
    "",
  );
  TestValidator.notEquals(
    "updated_at must change after third update",
    brandAfterThirdUpdate.updated_at,
    brandAfterSecondUpdate.updated_at,
  );
}
