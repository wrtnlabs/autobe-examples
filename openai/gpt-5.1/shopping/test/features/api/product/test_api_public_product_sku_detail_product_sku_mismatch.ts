import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_public_product_sku_detail_product_sku_mismatch(
  connection: api.IConnection,
) {
  // 1. Register seller and obtain authorized context
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create two products (A and B) as seller
  const baseProductStatus = "active";
  const defaultLocale = "en-US";

  const productABody = {
    code: `CODE-A-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Brand-A",
    model_name: "Model-A",
    status: baseProductStatus,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: defaultLocale,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  const productBBody = {
    code: `CODE-B-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Brand-B",
    model_name: "Model-B",
    status: baseProductStatus,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: defaultLocale,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert<IShoppingMallProduct>(productB);

  // 3. Register admin and obtain authorized context
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Create a category and link both products to that category as admin
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Test Category",
    description_en: "Category for SKU integrity tests",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  const productACategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productACategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productACategoryBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productACategory);

  const productBCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productBCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productB.id,
        body: productBCategoryBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productBCategory);

  // 5. Create an inventory state as admin
  const inventoryStateBody = {
    code: `STATE-${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: "Inventory available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 6. Switch back to seller session (explicit login)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 7. Create a SKU under product A
  const skuCreateBody = {
    code: `SKU-A-${RandomGenerator.alphaNumeric(8)}`,
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuOfProductA: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(skuOfProductA);

  // Sanity: fetch SKU with correct product+sku pair should succeed
  const skuFetchedWithCorrectProduct: IShoppingMallSku =
    await api.functional.shoppingMall.products.skus.at(connection, {
      productId: skuOfProductA.product.id,
      skuId: skuOfProductA.id,
    });
  typia.assert<IShoppingMallSku>(skuFetchedWithCorrectProduct);
  TestValidator.equals(
    "SKU fetched with correct product should match created SKU",
    skuFetchedWithCorrectProduct.id,
    skuOfProductA.id,
  );
  TestValidator.equals(
    "Parent product id from SKU should match product A id",
    skuFetchedWithCorrectProduct.product.id,
    productA.id,
  );

  // 8. Attempt mismatched productId + skuId pair and expect error
  await TestValidator.error(
    "Mismatched productId/skuId pair must not expose SKU details",
    async () => {
      await api.functional.shoppingMall.products.skus.at(connection, {
        productId: productB.id,
        skuId: skuOfProductA.id,
      });
    },
  );
}
