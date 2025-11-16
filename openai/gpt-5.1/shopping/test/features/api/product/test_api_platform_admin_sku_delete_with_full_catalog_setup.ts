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
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that a platform admin can delete a SKU that was created for a fully
 * configured catalog product with brand, category tree, and option structure,
 * and that attempting to delete it again fails.
 *
 * Business flow:
 *
 * 1. Join as platform admin (which also authenticates) using POST
 *    /auth/platformAdmin/join.
 * 2. As admin, create a category tree to simulate a configured catalog
 *    environment.
 * 3. As admin, create a brand via POST /shoppingMall/platformAdmin/brands.
 * 4. Join as seller using POST /auth/seller/join (which also authenticates as
 *    seller).
 * 5. As seller, create a multi-SKU product associated with the created brand using
 *    POST /shoppingMall/seller/products.
 * 6. As seller, create a product option type (e.g., Size) using POST
 *    /shoppingMall/seller/products/{productCode}/optionTypes.
 * 7. As seller, create one product option value (e.g., Large) using POST
 *    /shoppingMall/seller/products/{productCode}/optionTypes/{productOptionTypeId}/values.
 *    (We cannot bind the option value to the SKU because the corresponding
 *    endpoint is not provided, but we still ensure that option graph objects
 *    exist to reflect a realistic environment.)
 * 8. Switch back to admin context via POST /auth/platformAdmin/login to ensure we
 *    are acting as platform admin.
 * 9. As admin, create a SKU under the product via POST
 *    /shoppingMall/platformAdmin/products/{productCode}/skus.
 * 10. Assert the created SKU structure with typia.assert and basic property checks
 *     (e.g., productCode matches).
 * 11. As admin, delete the SKU via DELETE
 *     /shoppingMall/platformAdmin/products/{productCode}/skus/{skuCode}; ensure
 *     it completes without error.
 * 12. Attempt to delete the same SKU again and expect an error using
 *     TestValidator.error, which proves that the SKU is no longer deletable
 *     (and thus effectively removed).
 */
export async function test_api_platform_admin_sku_delete_with_full_catalog_setup(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (auto-auth)
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(2),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorizedOnJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  // 2. Create a category tree as admin
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
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

  // 3. Create a brand as admin
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Join as seller (auto-auth) so that connection now has seller token
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: "SellerPass123!",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorizedOnJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorizedOnJoin);

  // 5. As seller, create a multi-SKU product associated with the created brand
  const productCode = `PRD-${RandomGenerator.alphaNumeric(10)}`;

  const productBody = {
    shopping_mall_seller_id: sellerAuthorizedOnJoin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-main.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. As seller, create a product option type (e.g., Size)
  const optionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  // 7. As seller, create an option value (e.g., Large)
  const optionValueBody = {
    value: "L",
    display_name: "Large",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 8. Switch back to admin context via login (explicit auth swap)
  const adminLoginBody = {
    email: adminAuthorizedOnJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorizedOnLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  // 9. As admin, create a SKU under the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;

  const skuCreateBody = {
    code: skuCode,
    name: `Variant ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
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

  // Basic logical validations on created SKU
  TestValidator.equals(
    "created SKU code should match input code",
    sku.code,
    skuCreateBody.code,
  );
  TestValidator.equals(
    "created SKU productCode should match product.code",
    sku.productCode,
    product.code,
  );
  await TestValidator.predicate(
    "created SKU should be active and purchasable",
    async () => sku.isActive && sku.isPurchasable,
  );

  // 10. As admin, delete the SKU (should succeed)
  await api.functional.shoppingMall.platformAdmin.products.skus.erase(
    connection,
    {
      productCode: product.code,
      skuCode: sku.code,
    },
  );

  // 11. Attempt to delete the same SKU again and expect an error
  await TestValidator.error(
    "second deletion of same SKU should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.skus.erase(
        connection,
        {
          productCode: product.code,
          skuCode: sku.code,
        },
      );
    },
  );
}
