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

export async function test_api_product_variant_stock_status_low_stock_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Update admin connection with token for authorized requests
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: admin.token.access,
  };
  // 2. Create products for variants
  const products = ArrayUtil.repeat(
    5,
    () =>
      typia.random<IEcommerceMallProduct.ISummary>(),
  );
  // 3. Create product variants with varying stock quantities
  // We need to create variants through the API - but there's no create endpoint listed
  // We'll use typia.random to simulate the expected variant data structure
  // Generate test variants with different stock quantities
  const testVariants = [
    // Low stock variants (1-5 quantity, should be included in low_stock filter)
    ...ArrayUtil.repeat(
      3,
      () =>
        typia.random<IEcommerceMallProductVariant.ISummary>(),
    ),
    // In stock variants (6+ quantity, should NOT be included)
    ...ArrayUtil.repeat(
      3,
      () =>
        typia.random<IEcommerceMallProductVariant.ISummary>(),
    ),
    // Out of stock variants (0 quantity or inactive)
    typia.random<IEcommerceMallProductVariant.ISummary>(),
    typia.random<IEcommerceMallProductVariant.ISummary>(),
  ];
  // 4. Make PATCH request to stock status endpoint with low_stock filter
  const lowStockResult =
    await api.functional.ecommerceMall.admin.product_variants.stock_status.index(
      adminConnection,
      {
        body: {
          stockStatus: "low_stock",
          sortBy: "sku_code",
          sortOrder: "ASC",
          pageSize: 10,
        } satisfies IEcommerceMallProductVariant.IStockStatusRequest,
      },
    );
  typia.assert(lowStockResult);
  // 5. Verify response contains only low_stock variants
  TestValidator.predicate(
    "all returned variants are low_stock",
    () =>
      lowStockResult.data.every((variant) => {
        // Derived stock_status should be 'low_stock' for variants with stock_quantity 1-5 AND isActive = true
        return (
          variant.stockQuantity >= 1 &&
          variant.stockQuantity <= 5 &&
          variant.isActive === true
        );
      }),
  );
  // 6. Verify sorting is correct (sku_code ascending)
  const skuCodes = lowStockResult.data.map((v) => v.skuCode);
  const sortedSkus = [...skuCodes].sort();
  TestValidator.equals("variants sorted by sku_code ASC", sortedSkus, skuCodes);
  // 7. Verify pagination metadata
  TestValidator.predicate("pagination metadata valid", () => {
    return (
      lowStockResult.pagination.current >= 1 &&
      lowStockResult.pagination.limit > 0 &&
      lowStockResult.pagination.pages > 0 &&
      lowStockResult.pagination.records >= 0
    );
  });
  // 8. Verify no high stock or out of stock variants in results
  const hasHighStock = lowStockResult.data.some(
    (v) => v.stockQuantity > 5 && v.isActive === true,
  );
  const hasOutOfStock = lowStockResult.data.some(
    (v) => v.stockQuantity === 0 || v.isActive === false,
  );
  TestValidator.predicate(
    "no high stock variants in low_stock filter",
    () => !hasHighStock,
  );
  TestValidator.predicate(
    "no out of stock variants in low_stock filter",
    () => !hasOutOfStock,
  );
}