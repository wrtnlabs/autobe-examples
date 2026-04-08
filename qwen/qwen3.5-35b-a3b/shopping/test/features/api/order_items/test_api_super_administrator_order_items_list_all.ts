import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test the primary success path for the super administrator order items listing endpoint.
 *
 * Validates the basic functionality of listing all order items across all sellers without any filtering.
 * Ensures that the super administrator can view all order items with correct pagination,
 * sorting, and summary fields for each order item.
 *
 * Special attention is given to verifying that the response includes all required summary fields
 * and that pagination metadata accurately reflects the total number of records available.
 */
export async function test_api_super_administrator_order_items_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  typia.assert(adminAuth);
  // 2. Call order items index endpoint with no filters (default pagination: limit=20, page=null)
  const response =
    await api.functional.ecommerceMall.superAdministrator.order_items.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20 (default)",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => response.pagination.pages >= 0,
  );
  // 4. Validate order item summary structure when data exists
  if (response.data.length > 0) {
    const firstItem = response.data[0];
    typia.assert(firstItem);
    // Validate all required fields exist and have correct values
    TestValidator.predicate("order item has valid uuid id", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstItem.id,
      ),
    );
    TestValidator.predicate(
      "order number is not empty",
      () => firstItem.order_number.length > 0,
    );
    TestValidator.predicate(
      "seller display name is not empty",
      () => firstItem.seller_display_name.length > 0,
    );
    TestValidator.predicate(
      "product variant name is not empty",
      () => firstItem.product_variant_name.length > 0,
    );
    TestValidator.predicate(
      "product variant SKU code is not empty",
      () => firstItem.product_variant_sku_code.length > 0,
    );
    TestValidator.predicate(
      "product variant price is positive",
      () => firstItem.product_variant_price > 0,
    );
    TestValidator.predicate(
      "quantity is at least 1",
      () => firstItem.quantity >= 1,
    );
    TestValidator.predicate(
      "unit price is non-negative",
      () => firstItem.unit_price >= 0,
    );
    TestValidator.predicate(
      "subtotal is non-negative",
      () => firstItem.subtotal >= 0,
    );
    TestValidator.predicate("status is valid enum value", () =>
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        firstItem.status,
      ),
    );
    TestValidator.predicate(
      "created_at is valid date-time format",
      () => !isNaN(Date.parse(firstItem.created_at)),
    );
    // Validate calculated subtotal equals quantity * unit_price
    TestValidator.equals(
      "subtotal equals quantity * unit_price",
      firstItem.subtotal,
      firstItem.quantity * firstItem.unit_price,
    );
  }
}
