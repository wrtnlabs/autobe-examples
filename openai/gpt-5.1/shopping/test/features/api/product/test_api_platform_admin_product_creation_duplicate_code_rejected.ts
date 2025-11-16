import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that platform-admin product creation enforces global uniqueness of
 * product code.
 *
 * Business goal: Ensure that POST /shoppingMall/platformAdmin/products rejects
 * creation of a second product using an existing business-visible product
 * `code`, demonstrating that the unique index on shopping_mall_products.code is
 * enforced for platform-admin flows.
 *
 * End-to-end steps:
 *
 * 1. Register a platform administrator via POST /auth/platformAdmin/join.
 *
 *    - Use typia.random<IShoppingMallPlatformAdminJoin.IRequest>() to build the join
 *         payload.
 *    - Rely on the SDK to automatically attach the issued Authorization token to the
 *         connection.
 * 2. As the authenticated platform admin, create a category tree via POST
 *    /shoppingMall/platformAdmin/categoryTrees for catalog context.
 * 3. Create a brand via POST /shoppingMall/platformAdmin/brands.
 * 4. Using POST /shoppingMall/platformAdmin/products, create a first product with
 *    a concrete random `code` value (e.g., a 20-character alphanumeric string),
 *    binding it to the created brand and a randomly generated seller UUID for
 *    shopping_mall_seller_id.
 * 5. Assert that the first product is created successfully and that the returned
 *    `code` exactly matches the requested `code`.
 * 6. Attempt to create a second product via POST
 *    /shoppingMall/platformAdmin/products with the same `code` but altered
 *    name/description fields.
 * 7. Assert that this second creation call fails using TestValidator.error,
 *    indicating that duplicate codes are rejected.
 *
 * Due to the lack of a read/list endpoint for products in the provided SDK, we
 * cannot directly verify that only one product exists with the code. Instead,
 * the rejection of the second creation serves as the core uniqueness
 * validation.
 */
export async function test_api_platform_admin_product_creation_duplicate_code_rejected(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain an authorized session.
  const adminJoinRequest =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Create a category tree for catalog context.
  const categoryTreeCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  // 3. Create a brand that will be associated with the products.
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Prepare a shared product code and seller/brand associations.
  const productCode: string & tags.MinLength<1> =
    RandomGenerator.alphaNumeric(20);
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // First product creation payload.
  const firstProductBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: RandomGenerator.pick([true, false] as const),
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: JSON.stringify({
      source: "e2e",
      scenario: "duplicate-code",
    }),
  } satisfies IShoppingMallProduct.ICreate;

  const firstProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: firstProductBody,
      },
    );
  typia.assert(firstProduct);

  TestValidator.equals(
    "created product code matches requested code",
    firstProduct.code,
    productCode,
  );

  // 5. Attempt to create a second product with the same code but different descriptive fields.
  const secondProductBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 4 }),
    short_description: RandomGenerator.paragraph({ sentences: 6 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    status: "active",
    is_multi_sku: RandomGenerator.pick([true, false] as const),
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: JSON.stringify({
      source: "e2e",
      scenario: "duplicate-code-second",
    }),
  } satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error(
    "duplicate product code must be rejected for platform admin product creation",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.create(
        connection,
        {
          body: secondProductBody,
        },
      );
    },
  );
}
