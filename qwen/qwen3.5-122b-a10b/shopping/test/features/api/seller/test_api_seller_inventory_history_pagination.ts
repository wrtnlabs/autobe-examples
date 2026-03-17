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

export async function test_api_seller_inventory_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 2. Create product with variant (need to create inventory records)
  // Note: This would require product creation APIs which are not in the provided SDK
  // For this test, we'll use a random variant ID and focus on pagination logic
  // Generate a variant ID for testing pagination
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test pagination with default limit
  const page1 =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          page: 1,
          limit: 50,
          sort_by: "recorded_at",
          sort_order: "desc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata structure
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.predicate("page 1 limit positive", page1.pagination.limit > 0);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1.pagination.pages >= 0,
  );
  // 4. Test with different limit values
  const pageWithLimit10 =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          page: 1,
          limit: 10,
          sort_by: "recorded_at",
          sort_order: "desc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(pageWithLimit10);
  TestValidator.equals(
    "limit 10 pagination limit",
    pageWithLimit10.pagination.limit,
    10,
  );
  const pageWithLimit20 =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          page: 1,
          limit: 20,
          sort_by: "recorded_at",
          sort_order: "desc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(pageWithLimit20);
  TestValidator.equals(
    "limit 20 pagination limit",
    pageWithLimit20.pagination.limit,
    20,
  );
  // 5. Test pagination with limit 100 (maximum)
  const pageWithLimit100 =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          page: 1,
          limit: 100,
          sort_by: "recorded_at",
          sort_order: "desc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(pageWithLimit100);
  TestValidator.equals(
    "limit 100 pagination limit",
    pageWithLimit100.pagination.limit,
    100,
  );
  // 6. Test navigation through multiple pages (if records exist)
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.ecommerceMall.seller.variants.inventory_records.index(
        sellerConnection,
        {
          variantId,
          body: {
            page: 2,
            limit: page1.pagination.limit,
            sort_by: "recorded_at",
            sort_order: "desc",
          } satisfies IEcommerceMallInventoryRecord.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    // Verify ordering consistency - page 2 records should be older than page 1
    if (page1.data.length > 0 && page2.data.length > 0) {
      const page1LastRecordedAt = page1.data[page1.data.length - 1].recorded_at;
      const page2FirstRecordedAt = page2.data[0].recorded_at;
      TestValidator.predicate(
        "page 2 records older than page 1",
        page2FirstRecordedAt <= page1LastRecordedAt,
      );
    }
  }
  // 7. Validate inventory record structure
  if (page1.data.length > 0) {
    const record = page1.data[0];
    TestValidator.predicate("record has id", record.id.length > 0);
    TestValidator.predicate(
      "record has quantity_change",
      typeof record.quantity_change === "number",
    );
    TestValidator.predicate("record has reason", record.reason.length > 0);
    TestValidator.predicate(
      "record has recorded_at",
      record.recorded_at.length > 0,
    );
    TestValidator.predicate(
      "record has current_stock",
      typeof record.current_stock === "number",
    );
    TestValidator.predicate(
      "record has variant_sku_code",
      record.variant_sku_code.length > 0,
    );
    TestValidator.predicate(
      "record has product_name",
      record.product_name.length > 0,
    );
  }
  // 8. Test sorting by different fields
  const sortByQuantity =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          page: 1,
          limit: 20,
          sort_by: "quantity_change",
          sort_order: "desc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sortByQuantity);
  const sortByReason =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          page: 1,
          limit: 20,
          sort_by: "reason",
          sort_order: "asc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sortByReason);
}
