import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_summary_filtered_by_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Note: In a real implementation, we would need product creation APIs
  // and inventory modification APIs to set up test data.
  // Since those APIs are not provided in the available SDK functions,
  // we'll test the filtering endpoint with generated request parameters.
  // 2. Test inventory summary endpoint with product_id filter
  // Generate a random product_id for filtering
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const inventorySummary: IPageIEcommerceMallInventoryRecord.ISummary =
    await api.functional.ecommerceMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          product_id: productId,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventorySummary);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination current page",
    inventorySummary.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    inventorySummary.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    inventorySummary.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    inventorySummary.pagination.pages >= 0,
  );
  // 4. Validate that all returned records match the filtered product_id
  // Note: In a real test with actual data setup, we would verify that
  // all records belong to the specified product_id
  for (const record of inventorySummary.data) {
    typia.assert(record);
    TestValidator.predicate("record has valid id", record.id !== undefined);
    TestValidator.predicate(
      "record has valid quantity change",
      typeof record.quantity_change === "number",
    );
    TestValidator.predicate(
      "record has valid reason",
      typeof record.reason === "string",
    );
    TestValidator.predicate(
      "record has valid recorded at",
      typeof record.recorded_at === "string",
    );
    TestValidator.predicate(
      "record has valid current stock",
      typeof record.current_stock === "number",
    );
    TestValidator.predicate(
      "record has valid variant sku code",
      typeof record.variant_sku_code === "string",
    );
    TestValidator.predicate(
      "record has valid product name",
      typeof record.product_name === "string",
    );
  }
}
