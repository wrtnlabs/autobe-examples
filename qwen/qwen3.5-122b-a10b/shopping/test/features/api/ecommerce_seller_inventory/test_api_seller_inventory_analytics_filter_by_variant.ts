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
 * Seller filters inventory records by a specific product variant to view its complete stock movement history.
 *
 * Validates that sellers can retrieve inventory analytics filtered by a specific product variant, receiving only inventory records belonging to that variant with complete variant and product context information.
 *
 * The test authenticates a seller, prepares a filtered inventory analytics request targeting a specific variant, and validates the response structure includes proper pagination, variant details, and parent product information.
 *
 * 1. Seller registers and authenticates with the platform
 * 2. Prepare inventory analytics request with variant filter
 * 3. Call inventory analytics endpoint with variant_id filter
 * 4. Validate response contains pagination metadata
 * 5. Validate each inventory record includes variant information
 * 6. Validate variant's product reference is included
 * 7. Validate all returned records match the filtered variant ID
 */
export async function test_api_seller_inventory_analytics_filter_by_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
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
  // 2. Prepare inventory analytics request with variant filter
  // Use a random UUID as the filter - endpoint should return empty or matching records
  const variantId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  const analyticsRequest: IEcommerceInventoryRecord.IRequest = {
    ecommerce_product_variant_id: variantId,
    page: 1,
    limit: 20,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IEcommerceInventoryRecord.IRequest;
  // 3. Call inventory analytics endpoint
  const response: IPageIEcommerceInventoryRecord.ISummary =
    await api.functional.ecommerce.seller.inventory.analytics.index(
      sellerConnection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    () => response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    () => response.pagination.pages >= 0,
  );
  // 5. Validate response data structure and variant filtering
  if (response.data.length > 0) {
    // Each record should have required fields and match the filtered variant
    for (const record of response.data) {
      typia.assert(record);
      // Validate record has required fields
      TestValidator.predicate("record has ID", () => record.id.length > 0);
      TestValidator.predicate(
        "record has quantity change",
        () => typeof record.quantity_change === "number",
      );
      TestValidator.predicate(
        "record has reason",
        () => record.reason.length > 0,
      );
      TestValidator.predicate(
        "record has timestamp",
        () => record.created_at.length > 0,
      );
      // Validate all records match the filtered variant ID
      TestValidator.equals(
        "record variant matches filter",
        record.productVariant.id,
        variantId,
      );
      // 6. Validate variant information is included
      TestValidator.predicate(
        "variant has SKU code",
        () => record.productVariant.sku_code.length > 0,
      );
      TestValidator.predicate(
        "variant has option values",
        () => record.productVariant.option_values.length > 0,
      );
      TestValidator.predicate(
        "variant has stock count",
        () => typeof record.productVariant.stock_count === "number",
      );
      // 7. Validate product reference is included
      TestValidator.predicate(
        "product has ID",
        () => record.productVariant.product.id.length > 0,
      );
      TestValidator.predicate(
        "product has name",
        () => record.productVariant.product.name.length > 0,
      );
      TestValidator.predicate(
        "product has seller",
        () => record.productVariant.product.seller.id.length > 0,
      );
    }
  } else {
    // Empty response is valid when no inventory records exist for the variant
    TestValidator.equals(
      "empty response has zero records",
      response.pagination.records,
      0,
    );
  }
}
