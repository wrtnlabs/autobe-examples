import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * E2E: platform admin creates a brand and duplicate slug handling.
 *
 * Business workflow covered:
 *
 * 1. Register (join) a new platform administrator using /auth/platformAdmin/join.
 * 2. As that authenticated admin, create a new brand with minimal required data
 *    plus optional metadata.
 * 3. Validate that the response is a full IShoppingMallBrand entity with
 *    server-managed fields populated and not client-overridable.
 * 4. Attempt to create another brand with the same slug and confirm that the
 *    operation fails according to uniqueness constraints.
 */
export async function test_api_brand_creation_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join flow)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Sanity checks on authorized admin session
  TestValidator.predicate(
    "platform admin account is active",
    admin.isActive === true,
  );
  TestValidator.predicate(
    "platform admin token.access is non-empty",
    admin.token.access.length > 0,
  );

  // 2. Create a new brand as the authenticated platform admin
  const uniqueSlug = `brand-${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    name: RandomGenerator.name(2),
    slug: uniqueSlug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri:
      "https://cdn.example.com/brand-logos/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3. Validate created brand fields and system-managed properties
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
  TestValidator.equals(
    "created brand description matches input",
    brand.description ?? undefined,
    createBody.description,
  );
  TestValidator.equals(
    "created brand logo_uri matches input",
    brand.logo_uri ?? undefined,
    createBody.logo_uri,
  );

  TestValidator.predicate("brand id string is non-empty", brand.id.length > 0);
  TestValidator.predicate(
    "brand created_at is non-empty ISO timestamp string",
    brand.created_at.length > 0,
  );
  TestValidator.predicate(
    "brand updated_at is non-empty ISO timestamp string",
    brand.updated_at.length > 0,
  );
  TestValidator.equals(
    "brand deleted_at is initially undefined",
    brand.deleted_at ?? undefined,
    undefined,
  );

  // 4. Attempt to create a second brand with the same slug to test uniqueness
  const duplicateSlugBody = {
    name: RandomGenerator.name(2),
    slug: uniqueSlug, // same slug to hit uniqueness constraint
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri:
      "https://cdn.example.com/brand-logos/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  await TestValidator.error(
    "creating a brand with duplicate slug should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.brands.create(
        connection,
        {
          body: duplicateSlugBody,
        },
      );
    },
  );
}
