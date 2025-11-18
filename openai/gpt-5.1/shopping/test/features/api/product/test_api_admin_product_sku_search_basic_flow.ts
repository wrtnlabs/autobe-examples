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
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate admin-scoped SKU search with basic pagination for an existing
 * product.
 *
 * Business flow:
 *
 * 1. Register an admin and obtain its authorized context (token is set on
 *    connection).
 * 2. Register a seller and login as that seller.
 * 3. As the seller, create a base product using POST
 *    /shoppingMall/seller/products.
 * 4. Switch back to admin context using /auth/admin/login.
 * 5. Create a category via /shoppingMall/admin/categories.
 * 6. Associate the product to the category via
 *    /shoppingMall/admin/products/{productId}/categories.
 * 7. Create a SKU inventory state via /shoppingMall/admin/skuInventoryStates for
 *    realistic setup.
 * 8. As admin, call PATCH /shoppingMall/admin/products/{productId}/skus with
 *    minimal pagination request body.
 * 9. Verify pagination echoes the requested page and pageSize.
 * 10. Verify the response structure matches IPageIShoppingMallSku.ISummary.
 *
 * Note: We cannot create concrete SKUs with the provided APIs, nor does
 * IShoppingMallSku.ISummary expose productId. Therefore, we only validate
 * pagination echo and structural correctness; we do not assert that data
 * contains SKUs or that they belong to the product.
 */
export async function test_api_admin_product_sku_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register an admin account (join) and obtain authorization
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Register a seller and login as that seller so we can create a product
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // Seller login (not strictly necessary immediately after join, but mirrors realistic flow)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 3. As seller, create a base product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: `https://cdn.shoppingmall.test/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Switch back to admin context via login (ensures Authorization is admin)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 5. Create a category as admin
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 6. Associate the product with the category
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

  // 7. Create at least one SKU inventory state for realistic configuration
  const skuInventoryStateCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 8. As admin, search SKUs for the product with minimal pagination-only request
  const skuRequestBody = {
    page: 1,
    pageSize: 20,
  } satisfies IShoppingMallSku.IRequest;

  const pageResult: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.admin.products.skus.index(connection, {
      productId: product.id,
      body: skuRequestBody,
    });
  typia.assert(pageResult);

  // 9. Validate pagination echo behavior
  const pagination = pageResult.pagination;
  TestValidator.equals(
    "pagination current page should equal requested page",
    pagination.current,
    skuRequestBody.page,
  );
  TestValidator.equals(
    "pagination limit should equal requested pageSize",
    pagination.limit,
    skuRequestBody.pageSize,
  );

  // 10. Validate that response structure is coherent and that record counts are non-negative
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  // 11. If any SKUs exist, ensure each one has non-empty id, code, and name
  await ArrayUtil.asyncForEach(pageResult.data, async (sku, index) => {
    typia.assert<IShoppingMallSku.ISummary>(sku);
    TestValidator.predicate(
      `sku id should be a non-empty string at index ${index}`,
      typeof sku.id === "string" && sku.id.length > 0,
    );
    TestValidator.predicate(
      `sku code should be non-empty at index ${index}`,
      typeof sku.code === "string" && sku.code.length > 0,
    );
    TestValidator.predicate(
      `sku name should be non-empty at index ${index}`,
      typeof sku.name === "string" && sku.name.length > 0,
    );
  });
}
