import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuOptionValueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuOptionValueAssignment";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSkuOptionValueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionValueAssignment";

export async function test_api_seller_sku_option_value_assignments_list_empty_result_for_unassigned_sku(
  connection: api.IConnection,
) {
  // 1. Seller joins (registration + authentication)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Platform admin joins (dependency coverage; not used further in flow)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  // After platform admin join, connection headers now hold platform-admin token.
  // Switch back to seller context using seller.login so subsequent seller APIs
  // execute with seller authorization.
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerReAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerReAuthorized);

  // 3. Create product as seller (without brand)
  const productCode: string & tags.MinLength<1> = typia.random<
    string & tags.MinLength<1>
  >();

  const productCreateBody = {
    shopping_mall_seller_id: sellerReAuthorized.id,
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product code should match input code",
    product.code,
    productCode,
  );

  // 4. Create SKU under the product
  const skuCode: string = `${product.code}-sku`;

  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  TestValidator.equals(
    "sku productCode must match parent product.code",
    sku.productCode,
    product.code,
  );
  TestValidator.equals(
    "sku code should match input skuCode",
    sku.code,
    skuCode,
  );

  // 5. List option value assignments for unassigned SKU
  const requestPage = 1;
  const requestPageSize = 20;

  const optionAssignmentsRequest = {
    page: requestPage,
    pageSize: requestPageSize,
    sortBy: undefined,
    sortDirection: undefined,
    optionTypeCode: undefined,
    optionValueCode: undefined,
    createdFrom: undefined,
    createdTo: undefined,
  } satisfies IShoppingMallSkuOptionValueAssignment.IRequest;

  const page: IPageIShoppingMallSkuOptionValueAssignment.ISummary =
    await api.functional.shoppingMall.seller.products.skus.optionValueAssignments.index(
      connection,
      {
        productCode: product.code,
        skuCode: sku.code,
        body: optionAssignmentsRequest,
      },
    );
  typia.assert<IPageIShoppingMallSkuOptionValueAssignment.ISummary>(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 6. Business validations on pagination and data
  TestValidator.equals(
    "pagination current page index should be zero-based for requested page=1",
    pagination.current,
    0,
  );

  TestValidator.equals(
    "pagination limit should reflect requested pageSize",
    pagination.limit,
    requestPageSize,
  );

  TestValidator.equals(
    "no assignments means records should be 0",
    pagination.records,
    0,
  );

  TestValidator.equals(
    "no records should result in 0 pages",
    pagination.pages,
    0,
  );

  TestValidator.equals(
    "data array must be empty for unassigned SKU",
    page.data.length,
    0,
  );
}
