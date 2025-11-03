import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingInventoryAlert";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAlert";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * This test covers the scenario where an authenticated seller searches for all
 * inventory alerts (active and resolved) for a SKU that they own.
 *
 * Steps:
 *
 * 1. Register a new seller (with valid unique fake info).
 * 2. Create a new product with all required onboarding fields for the seller.
 * 3. Create a SKU under the new product (assign fake attribute values for required
 *    field).
 * 4. Search inventory alerts for the SKU (filter by various alert types and
 *    resolved status).
 * 5. Assert correct response structure, pagination, and that all returned alerts
 *    belong to the correct SKU.
 * 6. Attempt to search alerts as another seller (should yield forbidden/empty
 *    results).
 * 7. Check filtering with combinations of alert_type, resolved, and date ranges.
 */
export async function test_api_inventory_alerts_search_by_seller_for_sku(
  connection: api.IConnection,
) {
  // 1. Register new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create new product for the seller
  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    main_image_uri:
      "https://cdn.test.com/img/" + RandomGenerator.alphaNumeric(6) + ".png",
    status: "draft",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 3. Create single SKU for the product
  // Use the first attribute in product.attributes if available, else use random
  let attributeValueId: string;
  if (Array.isArray(product.attributes) && product.attributes.length > 0) {
    attributeValueId = typia.assert<IShoppingProductAttribute>(
      product.attributes[0],
    ).attribute_value.id;
  } else {
    // Fallback: make up a random UUID for test coverage (fake, but type-compatible)
    attributeValueId = typia.random<string & tags.Format<"uuid">>();
  }
  const skuBody = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: 10000,
    is_active: true,
    barcode: null,
    status: "in_stock",
    variant_attribute_value_ids: [attributeValueId],
  } satisfies IShoppingSku.ICreate;
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: skuBody,
    },
  );
  typia.assert(sku);

  // 4. Search for all alerts for this SKU
  // Use default pagination/sorting
  const page1 = await api.functional.shopping.seller.inventory.alerts.index(
    connection,
    {
      skuCode: sku.sku_code,
      body: {
        page: 1,
        limit: 20,
        sort_by: "triggered_at",
        sort_order: "desc",
      } satisfies IShoppingInventoryAlert.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "all alerts belong to the SKU",
    true,
    page1.data.every((alert) => alert.shopping_sku_id === sku.id),
  );

  // 5. Try filtering by alert_type and resolved status combinations
  for (const alertType of [
    "low_stock",
    "out_of_stock",
    "anomaly",
    "manual",
  ] as const) {
    const filtered =
      await api.functional.shopping.seller.inventory.alerts.index(connection, {
        skuCode: sku.sku_code,
        body: {
          alert_type: alertType,
          page: 1,
          limit: 10,
          sort_by: "triggered_at",
          sort_order: "desc",
        } satisfies IShoppingInventoryAlert.IRequest,
      });
    typia.assert(filtered);
    TestValidator.equals(
      `alerts filtered by type=${alertType} belong to the SKU`,
      true,
      filtered.data.every(
        (alert) =>
          alert.shopping_sku_id === sku.id && alert.alert_type === alertType,
      ),
    );
  }

  // 6. Filter by resolved only
  const resolvedOnly =
    await api.functional.shopping.seller.inventory.alerts.index(connection, {
      skuCode: sku.sku_code,
      body: {
        resolved: true,
        page: 1,
        limit: 5,
        sort_by: "triggered_at",
        sort_order: "desc",
      } satisfies IShoppingInventoryAlert.IRequest,
    });
  typia.assert(resolvedOnly);
  TestValidator.equals(
    "all resolved alerts have resolved_at timestamp",
    true,
    resolvedOnly.data.every(
      (alert) =>
        alert.resolved === true &&
        alert.resolved_at !== null &&
        alert.resolved_at !== undefined,
    ),
  );

  // 7. Filter by unresolved only
  const unresolvedOnly =
    await api.functional.shopping.seller.inventory.alerts.index(connection, {
      skuCode: sku.sku_code,
      body: {
        resolved: false,
        page: 1,
        limit: 5,
        sort_by: "triggered_at",
        sort_order: "desc",
      } satisfies IShoppingInventoryAlert.IRequest,
    });
  typia.assert(unresolvedOnly);
  TestValidator.equals(
    "all unresolved alerts are unresolved",
    true,
    unresolvedOnly.data.every((alert) => alert.resolved === false),
  );

  // 8. Date range filtering: triggered_at_from and triggered_at_to
  // Use the triggered_at date from any alert found, or a random date in the last 30 days if none
  let rangeStart: string | undefined;
  let rangeEnd: string | undefined;
  if (page1.data.length > 0) {
    const firstAlert = page1.data[0];
    rangeStart = firstAlert.triggered_at;
    rangeEnd = firstAlert.triggered_at;
  } else {
    // No data, use current date/time as range
    rangeStart = new Date().toISOString();
    rangeEnd = new Date().toISOString();
  }
  const rangeFiltered =
    await api.functional.shopping.seller.inventory.alerts.index(connection, {
      skuCode: sku.sku_code,
      body: {
        triggered_at_from: rangeStart,
        triggered_at_to: rangeEnd,
        page: 1,
        limit: 10,
        sort_by: "triggered_at",
        sort_order: "desc",
      } satisfies IShoppingInventoryAlert.IRequest,
    });
  typia.assert(rangeFiltered);
  TestValidator.equals(
    "date range filtered alerts belong to SKU",
    true,
    rangeFiltered.data.every((alert) => alert.shopping_sku_id === sku.id),
  );

  // 9. Attempt as another (unauthorized) seller
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(otherSeller);
  // Search for the original SKU using the new seller (should get no alerts or denied)
  const unauthorizedResult =
    await api.functional.shopping.seller.inventory.alerts.index(connection, {
      skuCode: sku.sku_code,
      body: {
        page: 1,
        limit: 10,
        sort_by: "triggered_at",
        sort_order: "desc",
      } satisfies IShoppingInventoryAlert.IRequest,
    });
  typia.assert(unauthorizedResult);
  TestValidator.equals(
    "unauthorized seller sees no alerts",
    0,
    unauthorizedResult.data.length,
  );
}
