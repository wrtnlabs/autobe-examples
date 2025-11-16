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
 * Validate basic platform-admin-driven catalog product creation.
 *
 * This scenario ensures that a platform administrator can bootstrap core
 * catalog configuration and then create a product using those prerequisites:
 *
 * - Join as a platform admin and obtain an authorized session.
 * - Create a category tree in the same admin session (prerequisite catalog
 *   configuration, even if not directly referenced by the product DTO).
 * - Create a brand and use its id when creating a product.
 * - Create a product via the platformAdmin products API and validate that
 *   response fields align with the request and that brand projection and
 *   lifecycle timestamps are populated.
 *
 * Steps:
 *
 * 1. Join platform admin via POST /auth/platformAdmin/join to establish an
 *    authenticated admin session with JWT tokens managed by the SDK.
 * 2. As the platform admin, create a category tree using POST
 *    /shoppingMall/platformAdmin/categoryTrees and validate basic persistence
 *    by checking code and name echo back.
 * 3. Still as the platform admin, create a brand using POST
 *    /shoppingMall/platformAdmin/brands and validate the core fields.
 * 4. Create a product via POST /shoppingMall/platformAdmin/products using
 *    IShoppingMallProduct.ICreate, associating it with the created brand and a
 *    syntactically valid seller UUID.
 * 5. Validate the resulting IShoppingMallProduct:
 *
 *    - Business identifiers (code, name, status, is_multi_sku) match input.
 *    - Brand summary is present and matches the created brand (id, name, slug, and
 *         that a logo URL is present when logo_uri was provided).
 *    - Seller summary is structurally valid (via typia.assert).
 *    - Lifecycle timestamps (created_at, updated_at) are populated.
 */
export async function test_api_platform_admin_product_creation_basic(
  connection: api.IConnection,
) {
  // 1. Join platform admin and establish authenticated session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  TestValidator.predicate("platform admin is active", admin.isActive);
  TestValidator.predicate(
    "platform admin id is non-empty",
    () => admin.id.length > 0,
  );

  // 2. Create category tree as platform admin
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  TestValidator.equals(
    "category tree code echoes input",
    categoryTree.code,
    categoryTreeBody.code,
  );
  TestValidator.equals(
    "category tree name echoes input",
    categoryTree.name,
    categoryTreeBody.name,
  );

  // 3. Create brand as platform admin
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  TestValidator.equals("brand name echoes input", brand.name, brandBody.name);
  TestValidator.equals("brand slug echoes input", brand.slug, brandBody.slug);
  TestValidator.equals(
    "brand description echoes input",
    brand.description ?? null,
    brandBody.description ?? null,
  );
  TestValidator.equals(
    "brand logo_uri echoes input",
    brand.logo_uri ?? null,
    brandBody.logo_uri ?? null,
  );

  // 4. Create product as platform admin
  const productStatusCandidates = ["draft", "active", "inactive"] as const;
  const pickedStatus = RandomGenerator.pick(productStatusCandidates);
  const multiSkuCandidates = [true, false] as const;
  const pickedIsMultiSku = RandomGenerator.pick(multiSkuCandidates);

  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: pickedStatus,
    is_multi_sku: pickedIsMultiSku,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: JSON.stringify({
      source: "e2e-test",
      categoryTreeCode: categoryTree.code,
    }),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  // 5. Business-level validations on product
  TestValidator.equals(
    "product code matches request",
    product.code,
    productBody.code,
  );
  TestValidator.equals(
    "product name matches request",
    product.name,
    productBody.name,
  );
  TestValidator.equals(
    "product status matches request",
    product.status,
    productBody.status,
  );
  TestValidator.equals(
    "product is_multi_sku matches request",
    product.is_multi_sku,
    productBody.is_multi_sku,
  );

  if (
    productBody.primary_image_uri !== null &&
    productBody.primary_image_uri !== undefined
  ) {
    TestValidator.equals(
      "product primary_image_uri matches request when set",
      product.primary_image_uri ?? null,
      productBody.primary_image_uri,
    );
  }

  if (
    productBody.additional_data !== null &&
    productBody.additional_data !== undefined
  ) {
    TestValidator.equals(
      "product additional_data matches request when set",
      product.additional_data ?? null,
      productBody.additional_data,
    );
  }

  if (product.brand !== null && product.brand !== undefined) {
    TestValidator.equals(
      "product brand id matches created brand id",
      product.brand.id,
      brand.id,
    );
    TestValidator.equals(
      "product brand name matches created brand name",
      product.brand.name,
      brand.name,
    );
    TestValidator.equals(
      "product brand slug matches created brand slug",
      product.brand.slug,
      brand.slug,
    );

    if (brand.logo_uri !== undefined) {
      TestValidator.predicate(
        "product brand logo_url is defined when brand logo_uri is provided",
        () => product.brand?.logo_url !== undefined,
      );
    }
  }

  TestValidator.predicate(
    "product created_at timestamp is populated",
    () => product.created_at.length > 0,
  );
  TestValidator.predicate(
    "product updated_at timestamp is populated",
    () => product.updated_at.length > 0,
  );
}
