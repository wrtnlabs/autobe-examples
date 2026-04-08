import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_items_administrator_search_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Search order items with status filter (no data in fresh DB - validates empty response)
  const searchResult =
    await api.functional.ecommerceMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          status: "paid" as const,
          limit: 20,
          order_by: "created_at" as const,
          order_direction: "DESC" as const,
        },
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination metadata for empty results
  TestValidator.equals(
    "pagination current page defaults to 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records is 0",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    searchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination data is empty array",
    searchResult.data.length,
    0,
  );
  // 4. Test with no filters (should return all order items or empty)
  const allSearchResult =
    await api.functional.ecommerceMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          limit: 20,
        },
      },
    );
  typia.assert(allSearchResult);
  TestValidator.predicate(
    "all search pagination records >= 0",
    allSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all search pagination pages >= 0",
    allSearchResult.pagination.pages >= 0,
  );
  // 5. Test pagination with larger limit (max 100)
  const largeLimitResult =
    await api.functional.ecommerceMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(largeLimitResult);
  TestValidator.equals(
    "large limit pagination limit is 100",
    largeLimitResult.pagination.limit,
    100,
  );
  // 6. Test date range filter (validates filter parameter is accepted)
  const dateRangeResult =
    await api.functional.ecommerceMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          created_at_from: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_to: new Date().toISOString(),
          limit: 20,
        },
      },
    );
  typia.assert(dateRangeResult);
  // 7. Test single order item summary structure validation
  if (allSearchResult.data.length > 0) {
    const item = allSearchResult.data[0];
    typia.assert(item);
    // Validate required fields exist and have valid values
    TestValidator.notEquals("item id is valid uuid", item.id, "");
    TestValidator.notEquals("item order_number exists", item.order_number, "");
    TestValidator.notEquals(
      "item seller_display_name exists",
      item.seller_display_name,
      "",
    );
    TestValidator.notEquals(
      "item product_variant_name exists",
      item.product_variant_name,
      "",
    );
    TestValidator.notEquals(
      "item product_variant_sku_code exists",
      item.product_variant_sku_code,
      "",
    );
    TestValidator.predicate(
      "item product_variant_price is positive",
      item.product_variant_price > 0,
    );
    TestValidator.predicate("item quantity >= 1", item.quantity >= 1);
    TestValidator.predicate("item unit_price is positive", item.unit_price > 0);
    TestValidator.predicate("item subtotal is positive", item.subtotal > 0);
    TestValidator.predicate(
      "item status is valid enum value",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.status,
      ),
    );
    TestValidator.notEquals("item created_at exists", item.created_at, "");
    // Validate subtotal calculation
    const expectedSubtotal = item.quantity * item.unit_price;
    TestValidator.equals(
      "subtotal equals quantity times unit_price",
      item.subtotal,
      expectedSubtotal,
    );
  }
}
