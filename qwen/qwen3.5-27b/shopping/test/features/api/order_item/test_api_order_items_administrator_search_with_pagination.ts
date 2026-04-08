import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an authenticated administrator can search and retrieve a paginated list of order items.
 *
 * Validates the administrator order items search endpoint with default pagination parameters. Ensures that administrators can view all order items across the platform with proper pagination metadata and complete item summaries.
 *
 * The test verifies that the response includes pagination information (current page, limit, total records, total pages) and that each order item contains all required fields including references to the parent order, product variant, and seller.
 *
 * 1. Administrator registers and authenticates to the system.
 * 2. Administrator calls the order items search endpoint with default pagination.
 * 3. Validates response structure and pagination metadata accuracy.
 * 4. Verifies each order item contains complete summary information.
 */
export async function test_api_order_items_administrator_search_with_pagination(
  connection: api.IConnection,
) {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Search order items with default pagination
  const output =
    await api.functional.shoppingMall.administrator.order_items.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(output);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("limit is 20", output.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    () => output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    () => output.pagination.pages >= 0,
  );
  // 4. Validate data array
  TestValidator.predicate("data is an array", () => Array.isArray(output.data));
  // 5. Validate each order item structure
  await ArrayUtil.asyncForEach(output.data, async (item, index) => {
    // Verify required fields exist
    TestValidator.predicate(
      `item ${index} has valid id`,
      () => typeof item.id === "string" && item.id.length > 0,
    );
    TestValidator.predicate(
      `item ${index} has valid quantity`,
      () => typeof item.quantity === "number" && item.quantity > 0,
    );
    TestValidator.predicate(
      `item ${index} has valid price`,
      () => typeof item.price === "number" && item.price >= 0,
    );
    TestValidator.predicate(`item ${index} has valid status`, () =>
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.status,
      ),
    );
    TestValidator.predicate(
      `item ${index} has valid created_at`,
      () => typeof item.created_at === "string" && item.created_at.length > 0,
    );
    // Verify order reference
    TestValidator.predicate(
      `item ${index} has order reference`,
      () => item.order !== null && item.order !== undefined,
    );
    TestValidator.predicate(
      `item ${index} order has valid id`,
      () => typeof item.order.id === "string" && item.order.id.length > 0,
    );
    TestValidator.predicate(
      `item ${index} order has valid order_number`,
      () =>
        typeof item.order.order_number === "string" &&
        item.order.order_number.length > 0,
    );
    // Verify product variant reference
    TestValidator.predicate(
      `item ${index} has productVariant reference`,
      () => item.productVariant !== null && item.productVariant !== undefined,
    );
    TestValidator.predicate(
      `item ${index} productVariant has valid id`,
      () =>
        typeof item.productVariant.id === "string" &&
        item.productVariant.id.length > 0,
    );
    TestValidator.predicate(
      `item ${index} productVariant has valid sku_code`,
      () =>
        typeof item.productVariant.sku_code === "string" &&
        item.productVariant.sku_code.length > 0,
    );
    // Verify seller reference
    TestValidator.predicate(
      `item ${index} has seller reference`,
      () => item.seller !== null && item.seller !== undefined,
    );
    TestValidator.predicate(
      `item ${index} seller has valid id`,
      () => typeof item.seller.id === "string" && item.seller.id.length > 0,
    );
    TestValidator.predicate(
      `item ${index} seller has valid email`,
      () =>
        typeof item.seller.email === "string" && item.seller.email.length > 0,
    );
  });
  // 6. Verify sorting by created_at descending (newest first)
  if (output.data.length > 1) {
    await ArrayUtil.asyncForEach(
      output.data.slice(0, -1),
      async (item, index) => {
        const nextItem = output.data[index + 1];
        TestValidator.predicate(
          `item ${index} created_at >= item ${index + 1} created_at (descending order)`,
          () => new Date(item.created_at) >= new Date(nextItem.created_at),
        );
      },
    );
  }
}
