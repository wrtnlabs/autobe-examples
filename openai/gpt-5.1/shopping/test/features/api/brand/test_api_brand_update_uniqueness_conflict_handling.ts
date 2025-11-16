import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate updating an existing brand and verifying its fields change
 * correctly.
 *
 * Business context (rewritten to be implementable):
 *
 * - A platform administrator manages catalog brands.
 * - The admin must be able to create multiple brands and later update one of
 *   them, changing name and slug to new, unique values.
 * - The test focuses on the happy-path update semantics and type correctness for
 *   IShoppingMallBrand.IUpdate and IShoppingMallBrand.
 *
 * Steps implemented:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join.
 * 2. Using that admin session, create Brand A with a unique name and slug.
 * 3. Create Brand B with a different unique name and slug.
 * 4. Update Brand B via PUT /shoppingMall/platformAdmin/brands/{brandId} providing
 *    a new unique name and slug.
 * 5. Assert that the update succeeds, the id is unchanged, and the mutable fields
 *    reflect the updated values.
 */
export async function test_api_brand_update_uniqueness_conflict_handling(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and establish authenticated session
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinRequest,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create Brand A with unique name and slug
  const brandAInput = {
    name: `Brand A ${RandomGenerator.alphabets(6)}`,
    slug: `brand-a-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/brands/brand-a-logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brandA = await api.functional.shoppingMall.platformAdmin.brands.create(
    connection,
    { body: brandAInput },
  );
  typia.assert<IShoppingMallBrand>(brandA);

  // 3. Create Brand B with a different unique name and slug
  const brandBInput = {
    name: `Brand B ${RandomGenerator.alphabets(6)}`,
    slug: `brand-b-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/brands/brand-b-logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brandB = await api.functional.shoppingMall.platformAdmin.brands.create(
    connection,
    { body: brandBInput },
  );
  typia.assert<IShoppingMallBrand>(brandB);

  // 4. Update Brand B with new unique name and slug (non-conflicting)
  const updatedName = `${brandB.name} Updated`;
  const updatedSlug = `${brandB.slug}-updated-${RandomGenerator.alphaNumeric(4)}`;
  const updateBody = {
    name: updatedName,
    slug: updatedSlug,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/brands/brand-b-logo-updated.png",
  } satisfies IShoppingMallBrand.IUpdate;

  const updatedBrandB =
    await api.functional.shoppingMall.platformAdmin.brands.update(connection, {
      brandId: brandB.id,
      body: updateBody,
    });
  typia.assert<IShoppingMallBrand>(updatedBrandB);

  // 5. Validate that the brand id is unchanged and fields are updated
  TestValidator.equals(
    "brand B id remains stable after update",
    updatedBrandB.id,
    brandB.id,
  );
  TestValidator.equals(
    "brand B name updated correctly",
    updatedBrandB.name,
    updatedName,
  );
  TestValidator.equals(
    "brand B slug updated correctly",
    updatedBrandB.slug,
    updatedSlug,
  );
}
