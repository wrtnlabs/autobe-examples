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
 * Verify clearing of nullable optional product fields via admin update.
 *
 * # Business intent
 *
 * This test ensures that a platform administrator can explicitly clear nullable
 * association and metadata fields on a catalog product using the platform admin
 * product update API:
 *
 * - Brand association (IShoppingMallProduct.brand / shopping_mall_brand_id)
 * - Additional_data (JSON metadata as string)
 *
 * The backend exposes these as nullable columns and allows null-capable
 * properties in IShoppingMallProduct.IUpdate (brandId, additionalData). The
 * test validates that when the admin passes explicit null values for these
 * properties, the backend:
 *
 * - Removes the brand association
 * - Clears the additional_data field while leaving required and non-targeted
 *   fields (including primary image URI, which is not nullable in the update
 *   DTO) unchanged.
 *
 * # Scenario steps
 *
 * 1. Register a platform administrator via POST /auth/platformAdmin/join.
 *
 *    - Use a random email and password, and random href/referrer URIs.
 *    - The SDK automatically installs the access token into the connection.
 * 2. Create a category tree via POST /shoppingMall/platformAdmin/categoryTrees.
 *
 *    - This satisfies scenario context that an active category tree exists.
 *    - The product model does not reference the tree, so no further use.
 * 3. Create a brand via POST /shoppingMall/platformAdmin/brands.
 *
 *    - Capture the brand.id to associate with the product on creation.
 * 4. Create a product via POST /shoppingMall/platformAdmin/products.
 *
 *    - Use IShoppingMallProduct.ICreate with:
 *
 *         - Shopping_mall_seller_id: random UUID (seller existence is out of scope).
 *         - Shopping_mall_brand_id: created brand.id (non-null association).
 *         - Code: random non-empty string so that we can target {productCode}.
 *         - Name: random non-empty string.
 *         - Short_description, description: some non-null text content.
 *         - Status: non-empty string (e.g., "active").
 *         - Is_multi_sku: false.
 *         - Primary_image_uri: non-null valid URI.
 *         - Additional_data: non-null JSON string (e.g., serialized object).
 *    - Assert that the created product reflects non-null values for brand and
 *         additional_data.
 * 5. Update the product via PUT
 *    /shoppingMall/platformAdmin/products/{productCode}.
 *
 *    - Call api.functional.shoppingMall.platformAdmin.products.update with:
 *
 *         - ProductCode: product.code from step 4.
 *         - Body: IShoppingMallProduct.IUpdate containing only the fields to clear:
 *
 *                           - BrandId: null
 *                           - AdditionalData: null
 *    - Do not send other properties so they remain unchanged (including primary
 *         image URI, which cannot be explicitly set to null by the current
 *         DTO).
 * 6. Validate the update response.
 *
 *    - Typia.assert on the returned IShoppingMallProduct.
 *    - Confirm that immutable fields and untouched required fields are intact:
 *
 *         - Id is still a UUID.
 *         - Code equals the original code.
 *         - Name equals the original name.
 *         - Status equals the original status.
 *         - Is_multi_sku equals the original is_multi_sku.
 *         - Primary_image_uri equals the original primary_image_uri.
 *    - Confirm that cleared fields have null semantics applied:
 *
 *         - Brand is now null or undefined.
 *         - Additional_data is null.
 */
export async function test_api_platform_admin_product_update_clear_optional_fields(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain an authorized connection.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree (scenario context only).
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}` as string,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Create a product with non-null optional fields.
  const productCode: string & tags.MinLength<1> =
    `prod-${RandomGenerator.alphaNumeric(12)}` as string & tags.MinLength<1>;

  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const createProductBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.example.com/products/primary.jpg" as string &
        tags.Format<"uri">,
    additional_data: JSON.stringify({ badge: "featured", rating: 4.8 }),
  } satisfies IShoppingMallProduct.ICreate;

  const created: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: createProductBody },
    );
  typia.assert(created);

  // Basic invariants on created product.
  TestValidator.equals(
    "created product code should match requested code",
    created.code,
    productCode,
  );
  TestValidator.predicate(
    "created product should have non-null brand before clearing",
    created.brand !== null && created.brand !== undefined,
  );
  TestValidator.predicate(
    "created product should have non-null additional_data before clearing",
    created.additional_data !== null && created.additional_data !== undefined,
  );

  const originalName: string = created.name;
  const originalStatus: string = created.status;
  const originalIsMultiSku: boolean = created.is_multi_sku;
  const originalPrimaryImageUri: string | null | undefined =
    created.primary_image_uri;

  // 5. Update the product to clear nullable fields via null assignments.
  const clearUpdateBody = {
    brandId: null,
    additionalData: null,
  } satisfies IShoppingMallProduct.IUpdate;

  const updated: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.update(
      connection,
      {
        productCode: created.code,
        body: clearUpdateBody,
      },
    );
  typia.assert(updated);

  // 6. Validate that required/untouched fields remain unchanged.
  TestValidator.equals(
    "updated product code should remain unchanged",
    updated.code,
    created.code,
  );
  TestValidator.equals(
    "updated product name should remain unchanged",
    updated.name,
    originalName,
  );
  TestValidator.equals(
    "updated product status should remain unchanged",
    updated.status,
    originalStatus,
  );
  TestValidator.equals(
    "updated product is_multi_sku should remain unchanged",
    updated.is_multi_sku,
    originalIsMultiSku,
  );
  TestValidator.equals(
    "updated product primary_image_uri should remain unchanged",
    updated.primary_image_uri ?? null,
    originalPrimaryImageUri ?? null,
  );

  // 6.1 Validate that cleared fields now have null semantics.
  TestValidator.predicate(
    "updated product brand summary should be cleared (null or undefined)",
    updated.brand === null || updated.brand === undefined,
  );
  TestValidator.equals(
    "updated product additional_data should be null after clearing",
    updated.additional_data,
    null,
  );
}
