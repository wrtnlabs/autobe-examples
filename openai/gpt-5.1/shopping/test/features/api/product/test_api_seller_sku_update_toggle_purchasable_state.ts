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
import type { IShoppingMallProductSkuChannelVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSkuChannelVisibility";
import type { IShoppingMallProductSkuMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSkuMetadata";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Toggle purchasability of a seller SKU while keeping catalog attributes
 * stable.
 *
 * This test simulates the realistic multi-actor workflow around SKU
 * configuration:
 *
 * - A seller and a platform admin both join and obtain authorized sessions.
 * - The platform admin prepares catalog scaffolding (category tree, brand, base
 *   product, and a SKU under that product).
 * - The seller creates its own product record mapped to the same productCode,
 *   defines an option type and value to represent real-world variant structure,
 *   and then uses the seller-facing SKU update endpoint to toggle only the
 *   `isPurchasable` flag.
 *
 * Steps:
 *
 * 1. Seller joins and obtains an authenticated session.
 * 2. Platform admin joins and obtains an authenticated session.
 * 3. As platform admin, create a category tree.
 * 4. As platform admin, create a brand.
 * 5. As platform admin, create a base product with `is_multi_sku = true` and
 *    associated brand.
 * 6. Switch to seller and create a seller product using the same product code so
 *    the seller-facing APIs can reference it.
 * 7. As seller, create a product option type and at least one option value to
 *    reflect variant dimensions.
 * 8. Switch to platform admin and create a SKU for the product with `isActive =
 *    true` and `isPurchasable = true`.
 * 9. Capture this SKU as the baseline snapshot.
 * 10. Switch to seller and call the SKU update endpoint with `isPurchasable =
 *     false` while omitting all other optional fields.
 * 11. Assert that:
 *
 *     - `isPurchasable` changed from true to false.
 *     - Identity fields (`id`, `code`, `productCode`) are unchanged.
 *     - Pricing fields (`listPrice`, `salePrice`, `currency`) and `isActive` are
 *           unchanged.
 *     - The nested `product` summary is preserved.
 * 12. Call the update endpoint again with `isPurchasable = true` and verify that
 *     the flag toggles back while all other fields remain stable.
 */
export async function test_api_seller_sku_update_toggle_purchasable_state(
  connection: api.IConnection,
) {
  // Helper: generate common URLs for auth flows
  const origin = "https://seller.example.com" as const;
  const adminOrigin = "https://admin.example.com" as const;

  // 1. Seller join (creates and authenticates seller session)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // Save seller email/password for later explicit login when switching actors
  const sellerEmail = sellerJoinBody.email;
  const sellerPassword = sellerJoinBody.password;

  // 2. Platform admin join (creates and authenticates platform admin session)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: `${adminOrigin}/join`,
    referrer: `${adminOrigin}/landing`,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  const adminEmail = adminJoinBody.email;
  const adminPassword = adminJoinBody.password;

  // 3. As platform admin, create a category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 4. As platform admin, create a brand
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 5. As platform admin, create a base product with is_multi_sku = true
  const productCode = `prod-${RandomGenerator.alphaNumeric(12)}`;

  const adminProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/products/primary.png" as string &
        tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: adminProductBody,
      },
    );
  typia.assert<IShoppingMallProduct>(adminProduct);

  // 6. Switch to seller context explicitly via login (even though join already set token)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: `${origin}/login`,
    referrer: `${origin}/landing`,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 6. As seller, create a seller-scoped product with the same business code
  const sellerProductBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/products/primary-seller.png" as string &
        tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert<IShoppingMallProduct>(sellerProduct);

  TestValidator.equals(
    "seller product code should match admin product code",
    sellerProduct.code,
    adminProduct.code,
  );

  // 7. As seller, create a product option type
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 8. As seller, create at least one option value under the option type
  const optionValueBody = {
    value: "blue",
    display_name: "Blue",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  // 9. Switch back to platform admin to create an initial SKU under the product
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: `${adminOrigin}/login`,
    referrer: `${adminOrigin}/landing`,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminLogin);

  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;

  const skuCreateBody = {
    code: skuCode,
    name: `${sellerProduct.name} / Blue`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const createdSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert<IShoppingMallProductSku>(createdSku);

  TestValidator.predicate(
    "initial SKU should be active and purchasable",
    createdSku.isActive === true && createdSku.isPurchasable === true,
  );

  // 10. Switch to seller again to perform SKU update operations
  const sellerLoginForUpdateBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: `${origin}/login-sku-update`,
    referrer: `${origin}/product/${productCode}`,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginForUpdate: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginForUpdateBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginForUpdate);

  // Capture baseline snapshot fields for later comparison
  const baselineSku = createdSku;

  // 11. Seller disables purchasability via minimal update body
  const disablePurchasableBody = {
    isPurchasable: false,
  } satisfies IShoppingMallProductSku.IUpdate;

  const disabledSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productCode,
      skuCode,
      body: disablePurchasableBody,
    });
  typia.assert<IShoppingMallProductSku>(disabledSku);

  // 12. Assertions for first toggle
  TestValidator.equals(
    "SKU id should remain stable after disabling purchasability",
    disabledSku.id,
    baselineSku.id,
  );
  TestValidator.equals(
    "SKU code should remain stable after disabling purchasability",
    disabledSku.code,
    baselineSku.code,
  );
  TestValidator.equals(
    "SKU productCode should remain stable after disabling purchasability",
    disabledSku.productCode,
    baselineSku.productCode,
  );
  TestValidator.equals(
    "SKU listPrice should remain unchanged after disabling purchasability",
    disabledSku.listPrice,
    baselineSku.listPrice,
  );
  TestValidator.equals(
    "SKU salePrice should remain unchanged after disabling purchasability",
    disabledSku.salePrice,
    baselineSku.salePrice,
  );
  TestValidator.equals(
    "SKU currency should remain unchanged after disabling purchasability",
    disabledSku.currency,
    baselineSku.currency,
  );
  TestValidator.equals(
    "SKU isActive should remain unchanged after disabling purchasability",
    disabledSku.isActive,
    baselineSku.isActive,
  );
  TestValidator.equals(
    "SKU nested product summary should remain unchanged after disabling purchasability",
    disabledSku.product,
    baselineSku.product,
  );
  TestValidator.equals(
    "isPurchasable should be false after disabling",
    disabledSku.isPurchasable,
    false,
  );
  TestValidator.notEquals(
    "isPurchasable should change from true to false",
    disabledSku.isPurchasable,
    baselineSku.isPurchasable,
  );

  // 13. Seller re-enables purchasability via update
  const enablePurchasableBody = {
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.IUpdate;

  const reenabledSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.update(connection, {
      productCode,
      skuCode,
      body: enablePurchasableBody,
    });
  typia.assert<IShoppingMallProductSku>(reenabledSku);

  // 14. Assertions for second toggle
  TestValidator.equals(
    "SKU id should remain stable after re-enabling purchasability",
    reenabledSku.id,
    baselineSku.id,
  );
  TestValidator.equals(
    "SKU code should remain stable after re-enabling purchasability",
    reenabledSku.code,
    baselineSku.code,
  );
  TestValidator.equals(
    "SKU productCode should remain stable after re-enabling purchasability",
    reenabledSku.productCode,
    baselineSku.productCode,
  );
  TestValidator.equals(
    "SKU listPrice should remain unchanged after re-enabling purchasability",
    reenabledSku.listPrice,
    baselineSku.listPrice,
  );
  TestValidator.equals(
    "SKU salePrice should remain unchanged after re-enabling purchasability",
    reenabledSku.salePrice,
    baselineSku.salePrice,
  );
  TestValidator.equals(
    "SKU currency should remain unchanged after re-enabling purchasability",
    reenabledSku.currency,
    baselineSku.currency,
  );
  TestValidator.equals(
    "SKU isActive should remain unchanged after re-enabling purchasability",
    reenabledSku.isActive,
    baselineSku.isActive,
  );
  TestValidator.equals(
    "SKU nested product summary should remain unchanged after re-enabling purchasability",
    reenabledSku.product,
    baselineSku.product,
  );
  TestValidator.equals(
    "isPurchasable should be true after re-enabling",
    reenabledSku.isPurchasable,
    true,
  );
  TestValidator.notEquals(
    "isPurchasable should change from false back to true",
    reenabledSku.isPurchasable,
    disabledSku.isPurchasable,
  );
}
