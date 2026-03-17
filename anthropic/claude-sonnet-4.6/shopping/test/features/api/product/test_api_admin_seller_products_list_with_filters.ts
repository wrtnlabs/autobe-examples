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

export async function test_api_admin_seller_products_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // ── 1. Register admin ──────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ── 2. Register seller ─────────────────────────────────────────────
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ── 3. Submit seller approval request ─────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ── 4. Admin approves seller ───────────────────────────────────────
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        },
      },
    );
  typia.assert(approvedApproval);
  // ── 5. Create a product category (as admin) ────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: `TestCategory-${RandomGenerator.alphaNumeric(8)}`,
      },
    },
  );
  typia.assert(category);
  // ── 6. Create 3 products as the approved seller ────────────────────
  // Product A: low price, unique keyword in name
  const uniqueKeyword = `UKEY${RandomGenerator.alphaNumeric(8)}`;
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `${uniqueKeyword} ProductAlpha`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 1000,
        categoryId: category.id,
      },
    },
  );
  typia.assert(productA);
  // Product B: high price, different name
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `ProductBeta-${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 5000,
        categoryId: category.id,
      },
    },
  );
  typia.assert(productB);
  // Product C: mid price, different name
  const productC = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `ProductGamma-${RandomGenerator.alphaNumeric(6)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 3000,
        categoryId: category.id,
      },
    },
  );
  typia.assert(productC);
  // Extract sellerId from productA's seller summary
  const sellerId = productA.seller.id;
  // ── 7. Primary success scenario: no filters ────────────────────────
  const allProducts =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId,
        body: {},
      },
    );
  typia.assert(allProducts);
  TestValidator.equals(
    "total records equals 3",
    allProducts.pagination.records,
    3,
  );
  TestValidator.equals("current page is 1", allProducts.pagination.current, 1);
  TestValidator.predicate(
    "all products have null deleted_at",
    allProducts.data.every((p) => p.deleted_at === null),
  );
  // ── 8. Filter by keyword ───────────────────────────────────────────
  const keywordFiltered =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId,
        body: {
          keyword: uniqueKeyword,
        },
      },
    );
  typia.assert(keywordFiltered);
  TestValidator.equals(
    "keyword filter returns 1 product",
    keywordFiltered.pagination.records,
    1,
  );
  TestValidator.predicate(
    "keyword filtered product name contains keyword",
    keywordFiltered.data[0]!.name.includes(uniqueKeyword),
  );
  // ── 9. Filter by price range (bracket only Product B at 5000) ─────
  const priceFiltered =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId,
        body: {
          minPrice: 4000,
          maxPrice: 6000,
        },
      },
    );
  typia.assert(priceFiltered);
  TestValidator.equals(
    "price filter returns 1 product",
    priceFiltered.pagination.records,
    1,
  );
  TestValidator.equals(
    "price filtered product matches Product B",
    priceFiltered.data[0]!.id,
    productB.id,
  );
  // ── 10. Filter by category ─────────────────────────────────────────
  const categoryFiltered =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId,
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(categoryFiltered);
  TestValidator.equals(
    "category filter returns 3 products",
    categoryFiltered.pagination.records,
    3,
  );
  // ── 11. Sort by basePrice ASC ──────────────────────────────────────
  const sortedByPrice =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId,
        body: {
          sort: "basePrice",
          sortDirection: "ASC",
        },
      },
    );
  typia.assert(sortedByPrice);
  TestValidator.predicate(
    "products sorted by base_price ascending",
    sortedByPrice.data.every(
      (p, i) =>
        i === 0 || p.base_price >= sortedByPrice.data[i - 1]!.base_price,
    ),
  );
  // ── 12. Pagination: page=1, limit=2 ───────────────────────────────
  const paginated =
    await api.functional.shoppingMall.admin.sellers.products.index(
      adminConnection,
      {
        sellerId,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "paginated total records is 3",
    paginated.pagination.records,
    3,
  );
  TestValidator.equals(
    "paginated total pages is 2",
    paginated.pagination.pages,
    2,
  );
  TestValidator.equals("paginated data length is 2", paginated.data.length, 2);
}
