import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBackorderSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBackorderSetting";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
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

export async function test_api_backorder_settings_retrieval_happy_path_for_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register platform admin via join (also authenticates the connection as admin)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.local/join",
    referrer: "https://admin.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. As platform admin, create a category tree (realistic setup but not strictly required later)
  const categoryTreeCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // 3. As platform admin, create a brand
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.local/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Register a seller via join (connection Authorization switches to seller)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.paragraph({ sentences: 1 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 5. As seller, create a product
  const productCode = RandomGenerator.alphaNumeric(16);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 1 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.local/product/" + RandomGenerator.alphaNumeric(8),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. As seller, define an option type for the product
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 7. As seller, define an option value under that option type
  const optionValueCreateBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 8. As seller, create a SKU for that product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: `${product.name} / ${optionValue.display_name ?? optionValue.value}`,
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 9. As seller, create an inventory item for the SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: true,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 10. Switch back to platform admin by logging in again
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.local/login",
    referrer: "https://admin.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 11. As platform admin, create backorder settings for the inventory item
  const backorderMessage = RandomGenerator.paragraph({ sentences: 3 });
  const backorderCreateBody = {
    allow_backorder: true,
    max_backorder_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_message: backorderMessage as string & tags.MinLength<1>,
  } satisfies IShoppingMallBackorderSetting.ICreate;

  const createdBackorder: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: backorderCreateBody,
      },
    );
  typia.assert(createdBackorder);

  // 12. As platform admin, retrieve backorder settings via GET
  const fetchedBackorder: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.at(
      connection,
      {
        inventoryItemId: inventoryItem.id,
      },
    );
  typia.assert(fetchedBackorder);

  // 13. Business assertions
  TestValidator.equals(
    "inventory item id should match between inventory and backorder settings",
    fetchedBackorder.inventoryItem.id,
    inventoryItem.id,
  );

  TestValidator.equals(
    "allow_backorder should match created value",
    fetchedBackorder.allow_backorder,
    backorderCreateBody.allow_backorder,
  );

  TestValidator.equals(
    "max_backorder_quantity should match created value",
    fetchedBackorder.max_backorder_quantity,
    backorderCreateBody.max_backorder_quantity,
  );

  TestValidator.equals(
    "backorder_message should match created value",
    fetchedBackorder.backorder_message,
    backorderCreateBody.backorder_message,
  );

  TestValidator.equals(
    "created_at should remain stable between create and fetch",
    fetchedBackorder.created_at,
    createdBackorder.created_at,
  );

  TestValidator.equals(
    "updated_at should remain stable between create and fetch",
    fetchedBackorder.updated_at,
    createdBackorder.updated_at,
  );
}
