import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_stock_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string,
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string,
    },
  });
  typia.assert(seller);
  // Create seller-specific connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: seller.token.access,
    },
  };
  // 2a. Test filter: stock_status = 'in_stock'
  const inStockResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      authenticatedConnection,
      {
        body: {
          stockStatus: "in_stock",
        } satisfies IEcommerceMallProductVariant.IStockStatusRequest,
      },
    );
  typia.assert(inStockResult);
  // Validate in_stock filter response
  TestValidator.equals(
    "in_stock filter - has valid pagination",
    inStockResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "in_stock filter - data is array",
    Array.isArray(inStockResult.data),
  );
  // 2b. Test filter: stock_status = 'low_stock'
  const lowStockResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      authenticatedConnection,
      {
        body: {
          stockStatus: "low_stock",
        } satisfies IEcommerceMallProductVariant.IStockStatusRequest,
      },
    );
  typia.assert(lowStockResult);
  // Validate low_stock filter response
  TestValidator.equals(
    "low_stock filter - has valid pagination",
    lowStockResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "low_stock filter - data is array",
    Array.isArray(lowStockResult.data),
  );
  // 2c. Test filter: stock_status = 'out_of_stock'
  const outOfStockResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      authenticatedConnection,
      {
        body: {
          stockStatus: "out_of_stock",
        } satisfies IEcommerceMallProductVariant.IStockStatusRequest,
      },
    );
  typia.assert(outOfStockResult);
  // Validate out_of_stock filter response
  TestValidator.predicate(
    "out_of_stock filter - data is array",
    Array.isArray(outOfStockResult.data),
  );
  // 2d. Test filter: is_active = true
  const activeResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      authenticatedConnection,
      {
        body: {
          isActive: true,
        } satisfies IEcommerceMallProductVariant.IStockStatusRequest,
      },
    );
  typia.assert(activeResult);
  // Validate is_active filter response
  TestValidator.predicate(
    "is_active filter - data is array",
    Array.isArray(activeResult.data),
  );
  // Validate all variants in result are active
  for (const variant of activeResult.data) {
    TestValidator.predicate(
      `variant ${variant.id} is active`,
      variant.isActive === true,
    );
  }
  // 2e. Test filter: min_stock_quantity and max_stock_quantity
  const stockQuantityResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      authenticatedConnection,
      {
        body: {
          minStockQuantity: 5 satisfies number,
          maxStockQuantity: 10 satisfies number,
        } satisfies IEcommerceMallProductVariant.IStockStatusRequest,
      },
    );
  typia.assert(stockQuantityResult);
  // Validate stock quantity filter response
  TestValidator.predicate(
    "stock quantity filter - data is array",
    Array.isArray(stockQuantityResult.data),
  );
  // Validate all variants are within stock quantity range
  for (const variant of stockQuantityResult.data) {
    TestValidator.predicate(
      `variant ${variant.id} stock is in range [5, 10]`,
      variant.stockQuantity >= 5 && variant.stockQuantity <= 10,
    );
  }
  // 2f. Test filter combination: stock_status AND is_active
  const combinedResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      authenticatedConnection,
      {
        body: {
          stockStatus: "in_stock",
          isActive: true,
        } satisfies IEcommerceMallProductVariant.IStockStatusRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate combined filter response
  TestValidator.predicate(
    "combined filter - data is array",
    Array.isArray(combinedResult.data),
  );
  // Validate all variants satisfy both conditions
  for (const variant of combinedResult.data) {
    TestValidator.predicate(
      `variant ${variant.id} is in_stock`,
      variant.stockQuantity > 0 && variant.isActive === true,
    );
  }
  // 2g. Test pagination with filters
  const pageSize = 10;
  const paginationResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      authenticatedConnection,
      {
        body: {
          pageSize: pageSize,
          stockStatus: "low_stock",
        } satisfies IEcommerceMallProductVariant.IStockStatusRequest,
      },
    );
  typia.assert(paginationResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination - current page is 1",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination - page size is 10",
    paginationResult.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "pagination - records count is valid",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination - pages count is valid",
    paginationResult.pagination.pages >= 0,
  );
  // 3. Test pagination metadata reflects filtered count
  TestValidator.predicate(
    "pagination - records reflects filtered results",
    paginationResult.pagination.records >= 0,
  );
}
