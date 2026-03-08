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

export async function test_api_product_variant_stock_status_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create NEW connection with admin token for authenticated requests
  const adminAuthConnection: api.IConnection = { host: connection.host };
  adminAuthConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 3. Make PATCH request to stock status endpoint with default parameters
  const response =
    await api.functional.ecommerceMall.admin.product_variants.stock_status.index(
      adminAuthConnection,
      {
        body: {} satisfies IEcommerceMallProductVariant.IStockStatusRequest,
      },
    );
  typia.assert(response);
  // 4. Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    response.pagination.records > 0
      ? Math.ceil(response.pagination.records / response.pagination.limit)
      : 0,
  );
  // 5. Verify data array has at least one variant
  TestValidator.equals(
    "has at least one variant",
    response.data.length,
    1,
    (key) => key !== "length",
  );
  TestValidator.predicate("has variants", response.data.length > 0);
  // 6. Verify first variant has valid structure
  const firstVariant = response.data[0];
  // 7. Verify variant has all required fields
  TestValidator.equals(
    "variant has valid id",
    firstVariant.id !== undefined,
    true,
  );
  TestValidator.equals(
    "variant has valid skuCode",
    firstVariant.skuCode !== undefined && firstVariant.skuCode.length > 0,
    true,
  );
  TestValidator.equals(
    "variant has stockQuantity",
    firstVariant.stockQuantity !== undefined,
    true,
  );
  TestValidator.equals(
    "variant has isActive",
    firstVariant.isActive !== undefined,
    true,
  );
  TestValidator.equals(
    "variant has displayPrice",
    firstVariant.displayPrice !== undefined,
    true,
  );
  // 8. Verify product relationship is populated
  const product = firstVariant.product;
  typia.assert(product);
  TestValidator.equals("product has valid id", product.id !== undefined, true);
  TestValidator.equals(
    "product has name",
    product.name !== undefined && product.name.length > 0,
    true,
  );
  TestValidator.equals(
    "product has base_price",
    product.base_price !== undefined,
    true,
  );
  TestValidator.equals(
    "product has is_active",
    product.is_active !== undefined,
    true,
  );
  typia.assert(product.seller);
  typia.assert(product.category);
  // 9. Verify displayPrice calculation
  // If priceOverride is set, displayPrice should equal priceOverride
  // Otherwise, displayPrice should equal product.base_price
  if (
    firstVariant.priceOverride !== undefined &&
    firstVariant.priceOverride !== null
  ) {
    TestValidator.equals(
      "displayPrice uses priceOverride when set",
      firstVariant.displayPrice,
      firstVariant.priceOverride,
    );
  } else {
    TestValidator.equals(
      "displayPrice uses base_price when no override",
      firstVariant.displayPrice,
      product.base_price,
    );
  }
  // 10. Verify default sorting (stock_quantity DESC)
  // First record should have highest or equal stock quantity
  if (response.data.length > 1) {
    const secondVariant = response.data[1];
    typia.assert(secondVariant);
    TestValidator.predicate(
      "sorted by stock_quantity DESC",
      firstVariant.stockQuantity >= secondVariant.stockQuantity,
    );
  }
}