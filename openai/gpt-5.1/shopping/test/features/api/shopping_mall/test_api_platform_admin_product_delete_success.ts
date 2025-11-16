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
 * Verify that a platform administrator can delete an existing catalog product
 * by its business-visible productCode.
 *
 * Business context: A platform admin manages the shopping mall catalog. They
 * can create category trees, brands, and products, then later remove products
 * fully from the catalog when they should no longer be sold. This test
 * exercises the happy-path workflow where an admin creates a product and then
 * deletes it using the dedicated DELETE endpoint that takes productCode.
 *
 * Test flow:
 *
 * 1. Register a platform admin using POST /auth/platformAdmin/join so that
 *    subsequent platformAdmin endpoints are authorized. Rely on the SDK to
 *    propagate the access token into the connection headers.
 * 2. As that admin, create a category tree via POST
 *    /shoppingMall/platformAdmin/categoryTrees using a valid
 *    IShoppingMallCategoryTree.ICreate payload. Although the category tree is
 *    not directly referenced by the product DTO in the provided schema, this
 *    step models realistic catalog initialization without asserting any linkage
 *    from the product.
 * 3. Create a brand via POST /shoppingMall/platformAdmin/brands with a realistic
 *    IShoppingMallBrand.ICreate payload (name, slug, and optional
 *    description/logo_uri). The brand object will be available for optional
 *    association from other scenarios but is not strictly required by the
 *    delete endpoint itself.
 * 4. Create a product via POST /shoppingMall/platformAdmin/products using
 *    IShoppingMallProduct.ICreate. Because the DTO requires a
 *    shopping_mall_seller_id but no seller-creation API is provided, the test
 *    uses typia.random<string & tags.Format<"uuid">>() for the seller id and,
 *    optionally, for shopping_mall_brand_id as well, focusing this scenario on
 *    exercising the delete path. All other fields (code, name, status,
 *    is_multi_sku, etc.) are populated with realistic random values that
 *    satisfy the DTO’s constraints.
 * 5. Capture the product.code from the creation response and call DELETE
 *    /shoppingMall/platformAdmin/products/{productCode} via
 *    api.functional.shoppingMall.platformAdmin.products.erase, ensuring that
 *    the path parameter is exactly the code returned from creation.
 * 6. Assert that the erase call completes successfully without throwing. Because
 *    the erase function’s return type is void and no read/list API is provided,
 *    the test must not attempt to re-fetch the product or inspect HTTP status
 *    codes. Instead, it uses TestValidator.predicate to verify simple
 *    invariants (e.g., that the product code used for deletion matches the
 *    created product’s code) and relies on the absence of thrown errors as
 *    evidence of success.
 *
 * Constraints and rules:
 *
 * - Use only the provided APIs: auth.platformAdmin.join,
 *   shoppingMall.platformAdmin.categoryTrees.create,
 *   shoppingMall.platformAdmin.brands.create,
 *   shoppingMall.platformAdmin.products.create, and
 *   shoppingMall.platformAdmin.products.erase.
 * - Never manipulate connection.headers directly; rely on the join endpoint to
 *   manage Authorization headers through the SDK.
 * - Do not implement any negative tests or type-error scenarios, and do not
 *   inspect HTTP status codes explicitly.
 * - Use typia.assert on non-void responses to validate response shapes.
 * - All API calls must be awaited, and all request bodies must use `satisfies`
 *   with the correct DTO type (no `as any`).
 */
export async function test_api_platform_admin_product_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authorized session.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree as part of realistic catalog setup.
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
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
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 3. Create a brand for catalog realism (not required by delete).
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 4. Create a product owned by some seller (UUID synthesized for test).
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: `P-${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.shoppingmall.test/product-primary.png",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "created product code should match request body code",
    product.code,
    productBody.code,
  );

  // 5. Delete the product by its business-visible productCode.
  const productCodeForDeletion: string = product.code;

  TestValidator.predicate(
    "product code for deletion is non-empty",
    productCodeForDeletion.length > 0,
  );

  await api.functional.shoppingMall.platformAdmin.products.erase(connection, {
    productCode: productCodeForDeletion,
  });

  // 6. If we reach here without an exception, consider deletion successful.
  TestValidator.predicate("erase endpoint completed without throwing", true);
}
