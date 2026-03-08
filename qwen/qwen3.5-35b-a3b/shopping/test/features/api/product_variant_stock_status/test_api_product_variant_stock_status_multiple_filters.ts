import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test product variant stock status endpoint with multiple filter parameters.
 * Validates combining isActive filter with stock quantity ranges and sorting.
 */
export async function test_api_product_variant_stock_status_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  const adminConnected: api.IConnection = { host: connection.host };
  adminConnected.headers = { Authorization: adminAuth.token.access };
  // 2. Test filter 1: isActive=true, minStockQuantity=1, maxStockQuantity=5
  const filter1: IEcommerceMallProductVariant.IStockStatusRequest = {
    isActive: true,
    minStockQuantity: 1,
    maxStockQuantity: 5,
    sortBy: "stock_quantity" as const,
    sortOrder: "DESC" as const,
    pageSize: 20,
  };
  const result1 =
    await api.functional.ecommerceMall.admin.product_variants.stock_status.index(
      adminConnected,
      {
        body: filter1,
      },
    );
  typia.assert(result1);
  // 3. Validate first filter results
  TestValidator.equals(
    "filter 1: pagination records count",
    result1.pagination.records,
    result1.data.length,
  );
  TestValidator.equals(
    "filter 1: all variants are active",
    result1.data.every((v) => v.isActive === true),
    true,
  );
  TestValidator.equals(
    "filter 1: all variants have stock between 1-5",
    result1.data.every(
      (v) =>
        v.stockQuantity >= 1 &&
        v.stockQuantity <= 5 &&
        v.stockQuantity >= filter1.minStockQuantity!,
    ),
    true,
  );
  TestValidator.equals(
    "filter 1: all variants have low_stock status",
    result1.data.every((v) => v.stockQuantity >= 1 && v.stockQuantity <= 5),
    true,
  );
  TestValidator.equals(
    "filter 1: sorted by stock_quantity descending",
    result1.data.every(
      (v, i, arr) => i === 0 || arr[i - 1].stockQuantity >= v.stockQuantity,
    ),
    true,
  );
  // 4. Test filter 2: isActive=false with stock filters
  const filter2: IEcommerceMallProductVariant.IStockStatusRequest = {
    isActive: false,
    minStockQuantity: 1,
    maxStockQuantity: 10,
    sortBy: "stock_quantity" as const,
    sortOrder: "ASC" as const,
    pageSize: 20,
  };
  const result2 =
    await api.functional.ecommerceMall.admin.product_variants.stock_status.index(
      adminConnected,
      {
        body: filter2,
      },
    );
  typia.assert(result2);
  // 5. Validate second filter results
  TestValidator.equals(
    "filter 2: pagination records count",
    result2.pagination.records,
    result2.data.length,
  );
  TestValidator.equals(
    "filter 2: all variants are inactive",
    result2.data.every((v) => v.isActive === false),
    true,
  );
  TestValidator.equals(
    "filter 2: all variants have stock within range",
    result2.data.every(
      (v) =>
        v.stockQuantity >= filter2.minStockQuantity! &&
        v.stockQuantity <= filter2.maxStockQuantity!,
    ),
    true,
  );
  TestValidator.equals(
    "filter 2: sorted by stock_quantity ascending",
    result2.data.every(
      (v, i, arr) => i === 0 || arr[i - 1].stockQuantity <= v.stockQuantity,
    ),
    true,
  );
  // 6. Test combined filtering with different stock statuses
  const filter3: IEcommerceMallProductVariant.IStockStatusRequest = {
    minStockQuantity: 6,
    maxStockQuantity: 100,
    sortBy: "sku_code" as const,
    sortOrder: "ASC" as const,
    pageSize: 20,
  };
  const result3 =
    await api.functional.ecommerceMall.admin.product_variants.stock_status.index(
      adminConnected,
      {
        body: filter3,
      },
    );
  typia.assert(result3);
  // 7. Validate third filter results
  TestValidator.equals(
    "filter 3: pagination records count",
    result3.pagination.records,
    result3.data.length,
  );
  TestValidator.equals(
    "filter 3: all variants have stock > 5",
    result3.data.every(
      (v) =>
        v.stockQuantity >= filter3.minStockQuantity! &&
        v.stockQuantity <= filter3.maxStockQuantity!,
    ),
    true,
  );
  TestValidator.equals(
    "filter 3: sorted by sku_code ascending",
    result3.data.every(
      (v, i, arr) => i === 0 || arr[i - 1].skuCode <= v.skuCode,
    ),
    true,
  );
}
