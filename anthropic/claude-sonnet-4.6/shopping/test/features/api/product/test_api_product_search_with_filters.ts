import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // ===== SETUP: Admin =====
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ===== SETUP: Seller =====
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // ===== SETUP: Seller approval =====
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // Admin approves the seller
  const updatedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(updatedApproval);
  // ===== SETUP: Category =====
  const topCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `TopCategory-${RandomGenerator.alphabets(8)}`,
          description: "Top level category for test",
        },
      },
    );
  typia.assert(topCategory);
  const subCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: topCategory.id,
          name: `SubCategory-${RandomGenerator.alphabets(8)}`,
          description: "Sub category for test",
        },
      },
    );
  typia.assert(subCategory);
  // ===== SETUP: Products =====
  // Use a unique prefix for keyword search test
  const uniquePrefix = `TESTPROD-${RandomGenerator.alphaNumeric(10)}`;
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `${uniquePrefix}-Alpha`,
        description: "Product with price 10",
        base_price: 10,
        categoryId: subCategory.id,
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `${uniquePrefix}-Beta`,
        description: "Product with price 50",
        base_price: 50,
        categoryId: subCategory.id,
      },
    },
  );
  typia.assert(product2);
  const product3 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `${uniquePrefix}-Gamma`,
        description: "Product with price 200",
        base_price: 200,
        categoryId: subCategory.id,
      },
    },
  );
  typia.assert(product3);
  // Public (unauthenticated) connection for browsing
  const publicConnection: api.IConnection = { host: connection.host };
  // ===== Case 1: No filters (default browse) =====
  const case1 = await api.functional.shoppingMall.products.index(
    publicConnection,
    {
      body: {} satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(case1);
  TestValidator.equals(
    "default pagination current",
    case1.pagination.current,
    1,
  );
  TestValidator.equals("default pagination limit", case1.pagination.limit, 20);
  TestValidator.predicate("data is non-empty", case1.data.length > 0);
  // Verify all 3 created products appear in the default listing
  const case1Ids = case1.data.map((p) => p.id);
  TestValidator.predicate(
    "product1 appears in default results",
    case1Ids.includes(product1.id),
  );
  TestValidator.predicate(
    "product2 appears in default results",
    case1Ids.includes(product2.id),
  );
  TestValidator.predicate(
    "product3 appears in default results",
    case1Ids.includes(product3.id),
  );
  // Verify no deleted products appear (deleted_at must be null)
  TestValidator.predicate(
    "no deleted products in default results",
    case1.data.every((p) => p.deleted_at === null),
  );
  // ===== Case 2: Keyword search =====
  const case2 = await api.functional.shoppingMall.products.index(
    publicConnection,
    {
      body: {
        keyword: uniquePrefix,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(case2);
  TestValidator.predicate(
    "keyword search returns at least 3 results",
    case2.data.length >= 3,
  );
  TestValidator.predicate(
    "all keyword results contain the unique prefix",
    case2.data.every((p) => p.name.includes(uniquePrefix)),
  );
  // Verify seller info: our test seller is not banned and not suspended
  TestValidator.predicate(
    "all products have non-banned, non-suspended seller",
    case2.data.every(
      (p) => p.seller.isBanned === false && p.seller.isSuspended === false,
    ),
  );
  // ===== Case 3: Price range filter (minPrice=20, maxPrice=100) =====
  const case3 = await api.functional.shoppingMall.products.index(
    publicConnection,
    {
      body: {
        minPrice: 20,
        maxPrice: 100,
        keyword: uniquePrefix,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(case3);
  // product2 (50) should appear, product1 (10) and product3 (200) should NOT
  const case3Ids = case3.data.map((p) => p.id);
  TestValidator.predicate(
    "product2 (price 50) appears in price range results",
    case3Ids.includes(product2.id),
  );
  TestValidator.predicate(
    "product1 (price 10) excluded from price range results",
    !case3Ids.includes(product1.id),
  );
  TestValidator.predicate(
    "product3 (price 200) excluded from price range results",
    !case3Ids.includes(product3.id),
  );
  TestValidator.predicate(
    "all price range results are within [20, 100]",
    case3.data.every((p) => p.base_price >= 20 && p.base_price <= 100),
  );
  // ===== Case 4: Sorting by basePrice ASC =====
  const case4 = await api.functional.shoppingMall.products.index(
    publicConnection,
    {
      body: {
        keyword: uniquePrefix,
        sort: "basePrice",
        sortDirection: "ASC",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(case4);
  TestValidator.predicate(
    "products sorted by base_price ASC",
    case4.data.every((p, i) => {
      if (i === 0) return true;
      const prev = case4.data[i - 1];
      return prev !== undefined && prev.base_price <= p.base_price;
    }),
  );
  // ===== Case 5: Pagination (limit=2, page=1) =====
  const case5 = await api.functional.shoppingMall.products.index(
    publicConnection,
    {
      body: {
        keyword: uniquePrefix,
        limit: 2,
        page: 1,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(case5);
  TestValidator.predicate(
    "pagination limit=2 returns at most 2 items",
    case5.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    case5.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 2", case5.pagination.limit, 2);
  // With 3 products and limit=2, we expect at least 2 pages
  TestValidator.predicate(
    "pagination pages reflects correct total",
    case5.pagination.pages >= 2,
  );
}
