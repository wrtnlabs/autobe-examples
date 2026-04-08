import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_approval_requests_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_seller_approval_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval_request";

export async function test_api_product_variant_browsing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller123",
      display_name: RandomGenerator.name(2),
      href: "https://seller.example.com",
      referrer: "https://seller.example.com/join",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "seller123",
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/login",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 2. Administrator registration and login (admin has NO href in ILogin)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(2),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: "admin123",
      referrer: "https://admin.example.com/login",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdministrator.ILogin,
  });
  typia.assert(adminLogin);
  // 3. Create product with base price
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 50000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step A: Default browsing (no filters)
  const defaultVariants =
    await api.functional.ecommerceMall.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(defaultVariants);
  TestValidator.equals(
    "default variants count",
    defaultVariants.data.length,
    6,
  );
  TestValidator.equals("current page", defaultVariants.pagination.current, 1);
  TestValidator.equals("page limit", defaultVariants.pagination.limit, 100);
  TestValidator.equals("total records", defaultVariants.pagination.records, 6);
  TestValidator.equals("total pages", defaultVariants.pagination.pages, 1);
  // Step B: Filter by in_stock
  const inStockVariants =
    await api.functional.ecommerceMall.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: { stock_status: "in_stock" },
      },
    );
  typia.assert(inStockVariants);
  TestValidator.equals(
    "in_stock variants count",
    inStockVariants.data.length,
    5,
  );
  // Step C: Filter by out_of_stock
  const outOfStockVariants =
    await api.functional.ecommerceMall.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: { stock_status: "out_of_stock" },
      },
    );
  typia.assert(outOfStockVariants);
  TestValidator.equals(
    "out_of_stock variants count",
    outOfStockVariants.data.length,
    1,
  );
  // Step D: Filter by SKU prefix
  const skuPrefixVariants =
    await api.functional.ecommerceMall.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: { sku_code_prefix: "LGT-RED" },
      },
    );
  typia.assert(skuPrefixVariants);
  TestValidator.equals(
    "SKU prefix variants count",
    skuPrefixVariants.data.length,
    3,
  );
  // Step E: Filter by price range
  const priceRangeVariants =
    await api.functional.ecommerceMall.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: { min_price: 50000, max_price: 55000 },
      },
    );
  typia.assert(priceRangeVariants);
  TestValidator.equals(
    "price range variants count",
    priceRangeVariants.data.length,
    3,
  );
  // Step F: Sort by price ascending
  const sortedByPrice =
    await api.functional.ecommerceMall.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: { sort_by: "price", sort_order: "asc" },
      },
    );
  typia.assert(sortedByPrice);
  TestValidator.equals(
    "price sorted variants count",
    sortedByPrice.data.length,
    6,
  );
  // Step G: Sort by stock quantity descending
  const sortedByStock =
    await api.functional.ecommerceMall.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: { sort_by: "stock_quantity", sort_order: "desc" },
      },
    );
  typia.assert(sortedByStock);
  TestValidator.equals(
    "stock sorted variants count",
    sortedByStock.data.length,
    6,
  );
  // Step H: Pagination test
  const paginatedVariants =
    await api.functional.ecommerceMall.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: { page: 2, page_size: 2 },
      },
    );
  typia.assert(paginatedVariants);
  TestValidator.equals(
    "pagination current page",
    paginatedVariants.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedVariants.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination records",
    paginatedVariants.pagination.records,
    6,
  );
  TestValidator.equals(
    "pagination pages",
    paginatedVariants.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page 2 has 2 variants",
    paginatedVariants.data.length,
    2,
  );
}
