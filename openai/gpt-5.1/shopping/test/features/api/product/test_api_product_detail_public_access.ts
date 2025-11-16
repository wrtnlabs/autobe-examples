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

export async function test_api_product_detail_public_access(
  connection: api.IConnection,
) {
  /**
   * E2E: public product detail access by business-visible product code.
   *
   * Steps:
   *
   * 1. Join as a platform admin using /auth/platformAdmin/join.
   * 2. As platform admin, create a category tree (dependency only, not asserted in
   *    detail).
   * 3. As platform admin, create a brand with a clear name/slug.
   * 4. As platform admin, create a new active product bound to the brand, with a
   *    distinctive product code, name, and descriptions.
   * 5. Using an anonymous connection (no auth headers), fetch the product via GET
   *    /shoppingMall/products/{productCode}.
   * 6. Assert that the returned IShoppingMallProduct:
   *
   *    - Has the expected code, name, short_description, description, status, and
   *         is_multi_sku values.
   *    - Contains a brand summary matching the created brand.
   *    - Contains a seller summary with basic, non-empty identity fields.
   *    - Passes typia.assert for strict schema conformance (including
   *         created_at/updated_at ISO 8601 timestamps).
   */

  // 1. Join as platform admin to bootstrap an authenticated admin context.
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree as a dependency (not directly used by product API).
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 3. Create a brand to associate with the product.
  const brandBody = {
    name: `Brand ${RandomGenerator.paragraph({ sentences: 1 })}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logos/brand.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Create a new active product with a distinctive business-visible code.
  const productCode: string = `prod-${RandomGenerator.alphaNumeric(10)}`;
  const productName: string = "Public Test Product";
  const productShortDescription: string = RandomGenerator.paragraph({
    sentences: 2,
  });
  const productDescription: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const productCreateBody = {
    shopping_mall_seller_id: typia.random<
      string & tags.Format<"uuid">
    >() satisfies string,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: productName,
    short_description: productShortDescription,
    description: productDescription,
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/images/product-primary.jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(createdProduct);

  // Sanity-check that code and brand have been persisted as expected in the created product.
  TestValidator.equals(
    "created product code matches requested code",
    createdProduct.code,
    productCode,
  );
  TestValidator.equals(
    "created product name matches requested name",
    createdProduct.name,
    productName,
  );
  TestValidator.equals(
    "created product status is active",
    createdProduct.status,
    "active",
  );

  // Brand summary should be present and match the created brand.
  TestValidator.predicate(
    "created product has brand summary",
    createdProduct.brand !== null && createdProduct.brand !== undefined,
  );
  if (createdProduct.brand !== null && createdProduct.brand !== undefined) {
    TestValidator.equals(
      "created product brand.id matches brand.id",
      createdProduct.brand.id,
      brand.id,
    );
    TestValidator.equals(
      "created product brand.name matches brand.name",
      createdProduct.brand.name,
      brand.name,
    );
    TestValidator.equals(
      "created product brand.slug matches brand.slug",
      createdProduct.brand.slug,
      brand.slug,
    );
  }

  // 5. Use an anonymous connection (no auth headers) to simulate guest access.
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const publicProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(anonymousConnection, {
      productCode,
    });
  typia.assert(publicProduct);

  // 6. Assertions on public response fields.
  TestValidator.equals(
    "public product code matches created product code",
    publicProduct.code,
    createdProduct.code,
  );
  TestValidator.equals(
    "public product name matches created product name",
    publicProduct.name,
    productName,
  );
  TestValidator.equals(
    "public product short_description matches created",
    publicProduct.short_description,
    productShortDescription,
  );
  TestValidator.equals(
    "public product description matches created",
    publicProduct.description,
    productDescription,
  );
  TestValidator.equals(
    "public product status matches created status",
    publicProduct.status,
    createdProduct.status,
  );
  TestValidator.equals(
    "public product is_multi_sku matches created",
    publicProduct.is_multi_sku,
    createdProduct.is_multi_sku,
  );

  // Brand summary must still be present and aligned with brand.
  TestValidator.predicate(
    "public product has brand summary",
    publicProduct.brand !== null && publicProduct.brand !== undefined,
  );
  if (publicProduct.brand !== null && publicProduct.brand !== undefined) {
    TestValidator.equals(
      "public product brand.id matches created brand.id",
      publicProduct.brand.id,
      brand.id,
    );
    TestValidator.equals(
      "public product brand.name matches created brand.name",
      publicProduct.brand.name,
      brand.name,
    );
    TestValidator.equals(
      "public product brand.slug matches created brand.slug",
      publicProduct.brand.slug,
      brand.slug,
    );
  }

  // Seller summary is present; we only check that it looks structurally valid.
  TestValidator.predicate(
    "public product has seller summary",
    publicProduct.seller !== null && publicProduct.seller !== undefined,
  );
  TestValidator.predicate(
    "seller.id is a non-empty string",
    publicProduct.seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller.email is a non-empty string",
    publicProduct.seller.email.length > 0,
  );
  TestValidator.predicate(
    "seller.store_name is a non-empty string",
    publicProduct.seller.store_name.length > 0,
  );
  TestValidator.predicate(
    "seller.status is a non-empty string",
    publicProduct.seller.status.length > 0,
  );
}
