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
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate platform-admin-driven SKU creation with catalog prerequisites.
 *
 * Business goal: Ensure that a platform administrator can create a SKU for a
 * product only after foundational catalog structures (category tree and brand)
 * and the parent product itself have been created, and that the created SKU is
 * correctly associated with the product (and indirectly with the brand via
 * product summary) while preserving requested pricing configuration and flags.
 *
 * Scenario steps:
 *
 * 1. Register a platform administrator via /auth/platformAdmin/join.
 *
 *    - This both creates the admin identity and configures the connection with a
 *         valid Authorization header via the SDK side-effect.
 * 2. Create a category tree via /shoppingMall/platformAdmin/categoryTrees.
 *
 *    - Use a unique code and name so we avoid uniqueness collisions.
 *    - Even though the product DTO does not directly reference category trees, this
 *         satisfies the documented prerequisite that catalog structures exist
 *         before SKU creation.
 * 3. Create a brand via /shoppingMall/platformAdmin/brands.
 *
 *    - Use a unique slug and human friendly name.
 * 4. Create a product via /shoppingMall/platformAdmin/products.
 *
 *    - Use a globally unique product code.
 *    - Configure status as an arbitrary non-empty string, e.g. "active".
 *    - Set is_multi_sku = true to indicate that SKUs/variants will be defined under
 *         this product.
 *    - Associate the product with the created brand via shopping_mall_brand_id.
 *    - For seller, because we do not have any seller creation/auth APIs in scope,
 *         generate a random UUID for shopping_mall_seller_id; this is
 *         acceptable in simulator-based E2E context and keeps us within
 *         provided DTOs and functions.
 * 5. Create a SKU under the product via
 *    /shoppingMall/platformAdmin/products/{productCode}/skus.
 *
 *    - Prepare IShoppingMallProductSku.ICreate body with:
 *
 *         - Code: unique within the product.
 *         - Name: random but human-readable variant name.
 *         - ListPrice and salePrice numeric values with salePrice <= listPrice.
 *         - Currency: e.g. "USD".
 *         - IsActive = true, isPurchasable = true.
 * 6. Validate business and data invariants:
 *
 *    - All API responses pass typia.assert(..) to guarantee structural correctness.
 *    - Verify that the created SKU’s productCode equals the parent product.code.
 *    - Verify that the SKU’s embedded product summary has the same id and name as
 *         the created product.
 *    - Verify that the SKU’s product.brand, when present, has the same id as the
 *         created brand.
 *    - Verify that listPrice, salePrice, currency, isActive and isPurchasable echo
 *         the create request payload.
 */
export async function test_api_platform_admin_create_sku_for_product_with_category_tree_prerequisites(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain authorized context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree prerequisite
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(10)}`,
    name: `Category Tree ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Create a brand prerequisite
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Create a parent product under the brand, configured as multi-SKU
  const productCode: string = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: `Product ${RandomGenerator.name(2)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  // Sanity check relationship between product and brand summary
  if (product.brand) {
    TestValidator.equals(
      "product brand id should match created brand id",
      product.brand.id,
      brand.id,
    );
  }

  // 5. Create a SKU variant under the product
  const listPrice = 100;
  const salePrice = 80;
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice,
    salePrice,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 6. Validate SKU associations and echoed fields
  TestValidator.equals(
    "sku.productCode should equal parent product code",
    sku.productCode,
    product.code,
  );

  TestValidator.equals(
    "sku.product.id should equal parent product id",
    sku.product.id,
    product.id,
  );

  TestValidator.equals(
    "sku.product.name should equal parent product name",
    sku.product.name,
    product.name,
  );

  if (sku.product.brand && product.brand) {
    TestValidator.equals(
      "sku.product.brand.id should equal product.brand.id",
      sku.product.brand.id,
      product.brand.id,
    );
  }

  TestValidator.equals(
    "sku.listPrice should equal requested listPrice",
    sku.listPrice,
    listPrice,
  );

  TestValidator.equals(
    "sku.salePrice should equal requested salePrice",
    sku.salePrice,
    salePrice,
  );

  TestValidator.equals(
    "sku.currency should equal requested currency",
    sku.currency,
    skuCreateBody.currency,
  );

  TestValidator.equals(
    "sku.isActive should equal requested isActive",
    sku.isActive,
    skuCreateBody.isActive,
  );

  TestValidator.equals(
    "sku.isPurchasable should equal requested isPurchasable",
    sku.isPurchasable,
    skuCreateBody.isPurchasable,
  );
}
