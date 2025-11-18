import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuExternalId";
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

/**
 * Validate admin SKU external ID search filtering and pagination.
 *
 * This test simulates a realistic admin + seller workflow to ensure that PATCH
 * /shoppingMall/admin/skus/{skuId}/externalIds correctly filters by system_code
 * and respects explicit pagination parameters.
 *
 * Business flow:
 *
 * 1. Register an admin and remain authenticated as that admin for all admin
 *    operations.
 * 2. Register a seller and authenticate as that seller for seller operations.
 * 3. As admin, create a category used for the product taxonomy.
 * 4. As seller, create a product that will own the SKU.
 * 5. As admin, associate the product with the category.
 * 6. As admin, create an inventory state configuration.
 * 7. As seller, create a SKU under the product, referencing the inventory state.
 * 8. As admin, create two external ID mappings for that SKU with different
 *    system_code values (e.g. "ERP" and "MARKETPLACE").
 * 9. As admin, call the search endpoint with a filter for system_code="ERP",
 *    external_id=null, page=1, limit=10, order_by="created_at",
 *    order_direction="desc".
 * 10. Assert that the pagination.current and pagination.limit match the requested
 *     values, and that all returned items have system_code="ERP".
 * 11. Assert that the mapping for the alternate system_code is not present in the
 *     filtered results.
 * 12. Repeat the search for system_code="MARKETPLACE" and verify analogous
 *     behavior.
 */
export async function test_api_admin_sku_external_ids_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register admin via /auth/admin/join (auto-authenticates as admin).
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "Adm1n!Pass" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.console.example.com/join" as string &
      tags.Format<"uri">,
    referrer: "https://admin.console.example.com/" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register seller via /auth/seller/join.
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com` as string &
      tags.Format<"email">,
    password: "Sell3r!Pass" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.console.example.com/join" as string &
      tags.Format<"uri">,
    referrer: "https://seller.console.example.com/" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Admin creates a category.
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 4. Switch to seller and create a product.
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.console.example.com/login" as string &
      tags.Format<"uri">,
    referrer: "https://seller.console.example.com/" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productCreateBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Switch back to admin and link product to category.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.console.example.com/login" as string &
      tags.Format<"uri">,
    referrer: "https://admin.console.example.com/" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 6. Admin creates an inventory state.
  const inventoryStateBody = {
    code: `INV-${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 7. Switch to seller and create a SKU for the product referencing the inventory state.
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 199.99 as number & tags.Minimum<0>,
    original_price: 249.99 as number & tags.Minimum<0>,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 8. Switch back to admin and create two external ID mappings for the SKU.
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const erpExternalIdBody = {
    system_code: "ERP",
    external_id: `ERP-${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IShoppingMallSkuExternalId.ICreate;
  const erpExternal: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: erpExternalIdBody,
      },
    );
  typia.assert(erpExternal);

  const marketplaceExternalIdBody = {
    system_code: "MARKETPLACE",
    external_id: `MKP-${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IShoppingMallSkuExternalId.ICreate;
  const marketplaceExternal: IShoppingMallSkuExternalId =
    await api.functional.shoppingMall.admin.skus.externalIds.create(
      connection,
      {
        skuId: sku.id,
        body: marketplaceExternalIdBody,
      },
    );
  typia.assert(marketplaceExternal);

  // 9. Search for ERP mappings with explicit pagination and ordering.
  const erpSearchRequest = {
    system_code: "ERP",
    external_id: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallSkuExternalId.IRequest;
  const erpPage: IPageIShoppingMallSkuExternalId.ISummary =
    await api.functional.shoppingMall.admin.skus.externalIds.index(connection, {
      skuId: sku.id,
      body: erpSearchRequest,
    });
  typia.assert(erpPage);

  // 10. Assert pagination fields and filter correctness for ERP.
  const erpPagination: IPage.IPagination = erpPage.pagination;
  typia.assert(erpPagination);

  TestValidator.equals(
    "ERP search pagination current page should be 1",
    erpPagination.current,
    1 as number,
  );
  TestValidator.equals(
    "ERP search pagination limit should be 10",
    erpPagination.limit,
    10 as number,
  );

  // All returned records must have system_code = "ERP".
  erpPage.data.forEach((item) => {
    typia.assert<IShoppingMallSkuExternalId.ISummary>(item);
    TestValidator.equals(
      "ERP search result system_code should be ERP",
      item.system_code,
      "ERP",
    );
  });

  // Ensure that the MARKETPLACE mapping is not present in ERP search results.
  const hasMarketplaceInErp = erpPage.data.some(
    (item) => item.system_code === marketplaceExternal.system_code,
  );
  TestValidator.predicate(
    "ERP search results must not contain MARKETPLACE mappings",
    !hasMarketplaceInErp,
  );

  // 11. Search for MARKETPLACE mappings with the same pagination parameters.
  const marketplaceSearchRequest = {
    system_code: "MARKETPLACE",
    external_id: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallSkuExternalId.IRequest;
  const marketplacePage: IPageIShoppingMallSkuExternalId.ISummary =
    await api.functional.shoppingMall.admin.skus.externalIds.index(connection, {
      skuId: sku.id,
      body: marketplaceSearchRequest,
    });
  typia.assert(marketplacePage);

  const marketplacePagination: IPage.IPagination = marketplacePage.pagination;
  typia.assert(marketplacePagination);

  TestValidator.equals(
    "MARKETPLACE search pagination current page should be 1",
    marketplacePagination.current,
    1 as number,
  );
  TestValidator.equals(
    "MARKETPLACE search pagination limit should be 10",
    marketplacePagination.limit,
    10 as number,
  );

  marketplacePage.data.forEach((item) => {
    typia.assert<IShoppingMallSkuExternalId.ISummary>(item);
    TestValidator.equals(
      "MARKETPLACE search result system_code should be MARKETPLACE",
      item.system_code,
      "MARKETPLACE",
    );
  });

  const hasErpInMarketplace = marketplacePage.data.some(
    (item) => item.system_code === erpExternal.system_code,
  );
  TestValidator.predicate(
    "MARKETPLACE search results must not contain ERP mappings",
    !hasErpInMarketplace,
  );
}
