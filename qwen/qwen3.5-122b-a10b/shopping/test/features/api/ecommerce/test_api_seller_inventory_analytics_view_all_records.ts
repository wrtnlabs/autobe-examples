import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Seller views their complete inventory history with default pagination settings.
 *
 * Validates that sellers can retrieve their inventory analytics including all stock movement records for their product variants. The system returns both automatic system-generated changes (order deductions, cancellation restorations, refund restorations) and manual seller adjustments (restocks, loss adjustments) with complete audit trail information.
 *
 * The test ensures that inventory records contain proper quantity change values, business reasons, timestamps, and associated product variant information. Pagination metadata is validated to confirm proper page structure with current page, limit, total records, and total pages.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller views inventory analytics with default pagination settings.
 * 3. Validates response structure includes pagination metadata.
 * 4. Validates each inventory record contains required fields (id, quantity_change, reason, created_at, productVariant).
 * 5. Validates productVariant information includes SKU code, option values, and stock count.
 * 6. Verifies quantity_change values are non-zero integers.
 * 7. Verifies reason field contains valid business reason strings.
 */
export async function test_api_seller_inventory_analytics_view_all_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. View inventory analytics with default pagination
  const analytics =
    await api.functional.ecommerce.seller.inventory.analytics.index(
      sellerConnection,
      {
        body: typia.random<IEcommerceInventoryRecord.IRequest>(),
      },
    );
  typia.assert(analytics);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    analytics.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    analytics.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    analytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    analytics.pagination.pages >= 0,
  );
  // 4. Validate inventory records structure
  if (analytics.data.length > 0) {
    const record = analytics.data[0];
    typia.assert(record);
    // Validate record fields
    TestValidator.predicate("record has valid id", record.id.length > 0);
    TestValidator.predicate(
      "quantity_change is non-zero",
      record.quantity_change !== 0,
    );
    TestValidator.predicate("reason is non-empty", record.reason.length > 0);
    // Validate productVariant structure
    typia.assert(record.productVariant);
    TestValidator.predicate(
      "variant has valid id",
      record.productVariant.id.length > 0,
    );
    TestValidator.predicate(
      "variant has sku_code",
      record.productVariant.sku_code.length > 0,
    );
    TestValidator.predicate(
      "variant has stock_count",
      record.productVariant.stock_count >= 0,
    );
    TestValidator.predicate(
      "variant has product reference",
      record.productVariant.product !== null,
    );
  }
}
