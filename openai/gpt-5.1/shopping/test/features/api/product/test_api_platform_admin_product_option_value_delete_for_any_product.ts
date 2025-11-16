import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that a platform administrator can delete a product option value for
 * any product in the catalog, even when the option value was created through
 * seller-scoped APIs, as long as no SKUs depend on that value.
 *
 * Business context:
 *
 * - Platform admins own cross-tenant catalog control.
 * - Sellers define option types and values under their products.
 * - Platform admins must be able to clean up orphan/unused option values
 *   regardless of seller ownership, provided there are no integrity conflicts
 *   such as SKUs referencing those values.
 *
 * Because SKU-related APIs are not provided in this test context, we enforce
 * the "not in use by SKUs" rule implicitly by never creating any SKUs. The test
 * only exercises option type/value creation and deletion.
 *
 * Scenario steps:
 *
 * 1. Join as a platform administrator (POST /auth/platformAdmin/join).
 *
 *    - Use typia.random to build a realistic
 *         IShoppingMallPlatformAdminJoin.IRequest.
 *    - Capture and assert the returned IShoppingMallPlatformAdmin.IAuthorized.
 *    - This also populates connection.headers.Authorization with the admin token.
 * 2. Create a category tree as platform admin (POST
 *    /shoppingMall/platformAdmin/categoryTrees).
 *
 *    - Build a simple but valid IShoppingMallCategoryTree.ICreate with a unique
 *         code, name, description, active flag and defaultLocale.
 *    - Even if the product APIs don't consume the category tree directly, its
 *         creation reflects realistic catalog setup and verifies that the admin
 *         token works for catalog-management APIs.
 * 3. Create a brand as platform admin (POST /shoppingMall/platformAdmin/brands).
 *
 *    - Build an IShoppingMallBrand.ICreate instance, setting name, slug, and
 *         optional description/logo_uri.
 *    - Assert the resulting IShoppingMallBrand and keep its id for association with
 *         products.
 * 4. Join as a seller (POST /auth/seller/join).
 *
 *    - Build IShoppingMallSellerJoin.IRequest with email, password, storeName, and
 *         optional contactPhone using RandomGenerator and typia.
 *    - Assert the IShoppingMallSeller.IAuthorized response.
 *    - After this call, connection.headers.Authorization will carry the seller
 *         token, switching the actor context to the seller.
 * 5. Create a product owned by the seller but using the platform-created brand
 *    (POST /shoppingMall/seller/products).
 *
 *    - Build IShoppingMallProduct.ICreate with:
 *
 *         - Shopping_mall_seller_id from the seller summary or auth object
 *         - Shopping_mall_brand_id from the brand.id
 *         - Unique product code, name, optional descriptions, status, is_multi_sku=true,
 *                   and optional primary_image_uri/additional_data.
 *    - Assert the returned IShoppingMallProduct and capture both its code and id for
 *         later use.
 * 6. (Optional sanity check) Also create the same product via platform admin
 *    products.create if desired to mirror a cross-actor scenario.
 *
 *    - However, since the delete endpoint is platformAdmin-scoped but uses
 *         productCode only, and seller/products.create already writes into
 *         shopping_mall_products, we can rely solely on the seller product. To
 *         keep the test minimal and focused, we skip the
 *         platformAdmin.products.create call.
 * 7. As the seller, create a product option type for the product (POST
 *    /shoppingMall/seller/products/{productCode}/optionTypes).
 *
 *    - Use the product.code from step 5.
 *    - Provide an IShoppingMallProductOptionType.ICreate body with name, optional
 *         display_name, and display_order.
 *    - Assert the returned IShoppingMallProductOptionType and capture its id.
 * 8. As the seller, create a product option value under that type (POST
 *    /shoppingMall/seller/products/{productCode}/optionTypes/{productOptionTypeId}/values).
 *
 *    - Use product.code and the optionType.id.
 *    - Provide an IShoppingMallProductOptionValue.ICreate body with value (internal
 *         key), display_name, display_order, and is_active.
 *    - Assert the returned IShoppingMallProductOptionValue and capture its id, plus
 *         confirm that the nested optionType summary matches the created type
 *         (via TestValidator.equals on ids).
 * 9. Switch actor context back to platform admin.
 *
 *    - Call api.functional.auth.platformAdmin.login with the same email/password
 *         used at join time and a valid href/referrer.
 *    - Assert the IShoppingMallPlatformAdmin.IAuthorized result. The SDK will update
 *         connection.headers.Authorization to the admin token again.
 * 10. As platform admin, delete the option value using the cross-tenant erase API
 *     (DELETE
 *     /shoppingMall/platformAdmin/products/{productCode}/optionTypes/{productOptionTypeId}/values/{productOptionValueId}).
 *
 *     - Call api.functional.shoppingMall.platformAdmin.products.optionTypes.values.erase
 *           with productCode, productOptionTypeId=optionType.id, and
 *           productOptionValueId=optionValue.id.
 *     - The function returns void; a successful call implies correct hierarchical
 *           validation (product -> optionType -> optionValue) and absence of
 *           SKU dependencies.
 * 11. Validate business expectations:
 *
 *     - Use TestValidator.predicate with a descriptive title to assert that the
 *           delete call completed without throwing an error. (This is implicit
 *           because any thrown error would fail the test before the predicate,
 *           but we can still mark the logical step.)
 *     - Because there are no list/get endpoints for option values in the provided
 *           SDK, we cannot explicitly re-fetch the option value to verify its
 *           absence. We document this limitation in comments and rely on the
 *           successful erase call as evidence of correct behavior.
 */
export async function test_api_platform_admin_product_option_value_delete_for_any_product(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Create a category tree as platform admin
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
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

  // 3. Create a brand as platform admin
  const brandBody = {
    name: RandomGenerator.name(1),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Join as a seller (switches connection to seller actor)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // 5. Create a product as the seller, associated with the brand
  const productCode = `prd-${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerJoin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(sellerProduct);
  TestValidator.equals(
    "product code should match",
    sellerProduct.code,
    productCode,
  );

  // 7. Create a product option type under the seller product
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 8. Create a product option value under that option type
  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // Confirm that the option value's optionType summary matches the created type
  TestValidator.equals(
    "option value should reference created option type",
    optionValue.optionType.id,
    optionType.id,
  );

  // 9. Switch back to platform admin via login
  const adminLoginBody = {
    email: adminJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 10. As platform admin, delete the option value using the erase endpoint
  await api.functional.shoppingMall.platformAdmin.products.optionTypes.values.erase(
    connection,
    {
      productCode: sellerProduct.code,
      productOptionTypeId: optionType.id,
      productOptionValueId: optionValue.id,
    },
  );

  // 11. Business expectation: if we reached this point, deletion succeeded
  TestValidator.predicate(
    "platform admin should be able to delete unused product option value",
    true,
  );
}
