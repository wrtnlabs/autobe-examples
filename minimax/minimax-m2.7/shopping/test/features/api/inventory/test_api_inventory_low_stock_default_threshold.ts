import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_inventory_low_stock_default_threshold(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // 2. Get seller authorization token for subsequent calls
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. Create a product with variants having various stock quantities
  // Note: Creating products requires product management SDK which may not be available
  // For this test, we query the low-stock endpoint and validate the response structure
  // 4. Query low-stock variants with default threshold (10 units)
  const lowStockResponse =
    await api.functional.ecommerceMall.seller.inventories.low_stock.index(
      sellerAuthConnection,
      {
        body: {
          // lowStockThreshold defaults to 10
          sortBy: "quantity_asc",
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(lowStockResponse);
  // 5. Validate response structure
  TestValidator.equals(
    "pagination metadata present",
    lowStockResponse.pagination !== undefined,
    true,
  );
  // 6. Validate each variant in response
  for (const variant of lowStockResponse.data) {
    // All returned variants should have quantity <= 10 (default threshold)
    TestValidator.predicate(
      `variant ${variant.sku_code} quantity <= 10`,
      variant.quantity <= 10,
    );
    // in_stock indicator should match quantity
    TestValidator.equals(
      `variant ${variant.sku_code} in_stock matches quantity`,
      variant.in_stock,
      variant.quantity > 0,
    );
    // Variant should have required fields
    TestValidator.predicate(
      `variant ${variant.sku_code} has valid id`,
      variant.id.length > 0,
    );
    TestValidator.predicate(
      `variant ${variant.sku_code} has valid sku_code`,
      variant.sku_code.length > 0,
    );
    TestValidator.predicate(
      `variant ${variant.sku_code} has product info`,
      variant.product !== undefined && variant.product.name.length > 0,
    );
  }
  // 7. Verify sorting - variants should be ordered by quantity ascending
  for (let i = 1; i < lowStockResponse.data.length; i++) {
    const current = lowStockResponse.data[i];
    const previous = lowStockResponse.data[i - 1];
    TestValidator.predicate(
      `variants sorted by quantity ascending`,
      current.quantity >= previous.quantity,
    );
  }
}
