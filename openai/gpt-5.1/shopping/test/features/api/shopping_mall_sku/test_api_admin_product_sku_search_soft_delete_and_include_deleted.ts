import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSku";
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

export async function test_api_admin_product_sku_search_soft_delete_and_include_deleted(
  connection: api.IConnection,
) {
  // 1. Admin join and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.local/join" as string &
      tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.local/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login" as string &
      tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.local/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Seller join and login
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: "127.0.0.1" as string & tags.Format<"ipv4"> satisfies string &
      tags.Format<"ipv4">,
    href: "https://seller.shoppingmall.local/join" as string &
      tags.Format<"uri">,
    referrer: "https://seller.shoppingmall.local/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.local/login" as string &
      tags.Format<"uri">,
    referrer: "https://seller.shoppingmall.local/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 3. Create a product as seller
  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. Create a category as admin and link product to category
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: null,
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 5. Create inventory state as admin
  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 6. Switch back to seller and create multiple SKUs
  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogin);

  const skuCount = 3;
  const skus: IShoppingMallSku[] = [];

  for (let i = 0; i < skuCount; i += 1) {
    const skuBody = {
      code: `${product.code}-SKU-${i + 1}` as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      barcode: null,
      status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
      price: 1000 + i * 100,
      original_price: null,
      inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
      shopping_mall_sku_inventory_state_id: inventoryState.id,
      attribute_value_ids: [],
      external_ids: [],
    } satisfies IShoppingMallSku.ICreate;

    const createdSku: IShoppingMallSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: product.id,
          body: skuBody,
        },
      );
    typia.assert(createdSku);
    skus.push(createdSku);
  }

  TestValidator.equals("created sku count", skus.length, skuCount);

  const deletedSku: IShoppingMallSku = skus[0];

  // 7. Soft-delete one SKU via seller DELETE endpoint
  await api.functional.shoppingMall.seller.products.skus.erase(connection, {
    productId: product.id,
    skuId: deletedSku.id,
  });

  // 8. Search SKUs as admin with includeDeleted omitted (default behavior)
  const adminSearchRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminSearchRelogin);

  const baseRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    productId: product.id,
    status: undefined,
    statusList: undefined,
    inventoryStateCode: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minInventoryQuantity: undefined,
    maxInventoryQuantity: undefined,
    lowStockOnly: undefined,
    includeDeleted: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    sortField: undefined,
    sortDirection: undefined,
  } satisfies IShoppingMallSku.IRequest;

  const pageWithoutDeleted: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.products.skus.index(connection, {
      productId: product.id,
      body: baseRequest,
    });
  typia.assert(pageWithoutDeleted);

  const activeSkuIds: string[] = pageWithoutDeleted.data.map((s) => s.id);

  TestValidator.predicate(
    "at least one active sku is returned when searching without includeDeleted",
    activeSkuIds.length > 0,
  );

  TestValidator.predicate(
    "soft-deleted sku should NOT appear when includeDeleted is omitted",
    activeSkuIds.includes(deletedSku.id) === false,
  );

  const baseRequestWithDeleted = {
    ...baseRequest,
    includeDeleted: true,
  } satisfies IShoppingMallSku.IRequest;

  const pageWithDeleted: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.products.skus.index(connection, {
      productId: product.id,
      body: baseRequestWithDeleted,
    });
  typia.assert(pageWithDeleted);

  const skuIdsWithDeleted: string[] = pageWithDeleted.data.map((s) => s.id);

  TestValidator.predicate(
    "soft-deleted sku should appear when includeDeleted is true",
    skuIdsWithDeleted.includes(deletedSku.id),
  );

  TestValidator.predicate(
    "result with includeDeleted should have at least as many items as without",
    pageWithDeleted.data.length >= pageWithoutDeleted.data.length,
  );

  const missingFromWithDeleted = activeSkuIds.filter(
    (id) => !skuIdsWithDeleted.includes(id),
  );

  TestValidator.equals(
    "all non-deleted skus should still be present when includeDeleted is true",
    missingFromWithDeleted.length,
    0,
  );
}
