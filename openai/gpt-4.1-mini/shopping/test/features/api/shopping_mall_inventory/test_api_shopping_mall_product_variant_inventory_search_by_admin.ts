import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_product_variant_inventory_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    password: "P@ssw0rd123",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  // 2. Seller joins and authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinInput = {
    email: sellerEmail,
    password: "P@ssw0rd123",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(seller);

  // 3. Seller creates a product
  // Since we don't have category code from category summary, generate realistic category_code
  const categoryCode = RandomGenerator.alphaNumeric(8);

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(),
    category_code: categoryCode,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 4. Seller creates a product variant SKU
  const variantCreateBody = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(12),
    color: RandomGenerator.name(),
    size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
    option: null,
    price: Math.floor(5000 + Math.random() * 15000),
    status: "active",
  } satisfies IShoppingMallProductVariant.ICreate;

  const variant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductVariants.create(
      connection,
      {
        productCode: product.code,
        body: variantCreateBody,
      },
    );
  typia.assert(variant);

  // 5. Admin authenticates via login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "P@ssw0rd123",
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 6. Admin searches product variant inventories with pagination
  const inventorySearchBody = {
    page: 1,
    limit: 10,
    quantity_min: null,
    quantity_max: null,
    reserved_quantity_min: null,
    reserved_quantity_max: null,
    restock_date_from: null,
    restock_date_to: null,
  } satisfies IShoppingMallInventory.IRequest;

  const inventoriesPage: IPageIShoppingMallInventory.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallProductVariants.shoppingMallInventories.index(
      connection,
      {
        skuCode: variant.sku_code,
        body: inventorySearchBody,
      },
    );
  typia.assert(inventoriesPage);
  TestValidator.predicate(
    "pagination page must be 1",
    inventoriesPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit must be 10",
    inventoriesPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "inventory ids are non-empty strings",
    inventoriesPage.data.every(
      (inv) => typeof inv.id === "string" && inv.id.length > 0,
    ),
  );
}
