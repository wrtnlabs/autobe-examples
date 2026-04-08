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
 * Test that an administrator can filter order items by their fulfillment status.
 *
 * Validates the order items filtering functionality for administrators, ensuring that order items can be correctly filtered by their status (paid, shipped, delivered, cancelled, refunded). The test verifies that only items matching the specified status are returned and that the pagination metadata accurately reflects the filtered results.
 *
 * Special attention is given to verifying that each returned order item maintains its complete summary structure, including references to the parent order, product variant, and seller information, even when filtered by status.
 *
 * 1. Register and authenticate as an administrator.
 * 2. Filter order items by status='shipped' and validate all items have matching status.
 * 3. Filter order items by status='cancelled' and validate all items have matching status.
 * 4. Filter order items by status='delivered' and validate all items have matching status.
 * 5. Filter order items by status='paid' and validate all items have matching status.
 * 6. Filter order items by status='refunded' and validate all items have matching status.
 * 7. Verify pagination metadata is accurate for each filter result.
 */
export async function test_api_order_items_administrator_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Test filtering by status='shipped'
  const shippedResult =
    await api.functional.shoppingMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          status: "shipped",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedResult);
  TestValidator.predicate(
    "shipped filter returns correct status",
    shippedResult.data.every((item) => item.status === "shipped"),
  );
  TestValidator.equals(
    "shipped pagination records matches data length",
    shippedResult.pagination.records,
    shippedResult.data.length,
  );
  // 3. Test filtering by status='cancelled'
  const cancelledResult =
    await api.functional.shoppingMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          status: "cancelled",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(cancelledResult);
  TestValidator.predicate(
    "cancelled filter returns correct status",
    cancelledResult.data.every((item) => item.status === "cancelled"),
  );
  TestValidator.equals(
    "cancelled pagination records matches data length",
    cancelledResult.pagination.records,
    cancelledResult.data.length,
  );
  // 4. Test filtering by status='delivered'
  const deliveredResult =
    await api.functional.shoppingMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          status: "delivered",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(deliveredResult);
  TestValidator.predicate(
    "delivered filter returns correct status",
    deliveredResult.data.every((item) => item.status === "delivered"),
  );
  TestValidator.equals(
    "delivered pagination records matches data length",
    deliveredResult.pagination.records,
    deliveredResult.data.length,
  );
  // 5. Test filtering by status='paid'
  const paidResult =
    await api.functional.shoppingMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(paidResult);
  TestValidator.predicate(
    "paid filter returns correct status",
    paidResult.data.every((item) => item.status === "paid"),
  );
  TestValidator.equals(
    "paid pagination records matches data length",
    paidResult.pagination.records,
    paidResult.data.length,
  );
  // 6. Test filtering by status='refunded'
  const refundedResult =
    await api.functional.shoppingMall.administrator.order_items.index(
      adminConnection,
      {
        body: {
          status: "refunded",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(refundedResult);
  TestValidator.predicate(
    "refunded filter returns correct status",
    refundedResult.data.every((item) => item.status === "refunded"),
  );
  TestValidator.equals(
    "refunded pagination records matches data length",
    refundedResult.pagination.records,
    refundedResult.data.length,
  );
  // 7. Verify complete summary structure for at least one item from each status
  if (shippedResult.data.length > 0) {
    const sampleShipped = shippedResult.data[0];
    TestValidator.predicate(
      "shipped item has order reference",
      sampleShipped.order !== undefined,
    );
    TestValidator.predicate(
      "shipped item has productVariant reference",
      sampleShipped.productVariant !== undefined,
    );
    TestValidator.predicate(
      "shipped item has seller reference",
      sampleShipped.seller !== undefined,
    );
  }
  if (cancelledResult.data.length > 0) {
    const sampleCancelled = cancelledResult.data[0];
    TestValidator.predicate(
      "cancelled item has order reference",
      sampleCancelled.order !== undefined,
    );
    TestValidator.predicate(
      "cancelled item has productVariant reference",
      sampleCancelled.productVariant !== undefined,
    );
    TestValidator.predicate(
      "cancelled item has seller reference",
      sampleCancelled.seller !== undefined,
    );
  }
  if (deliveredResult.data.length > 0) {
    const sampleDelivered = deliveredResult.data[0];
    TestValidator.predicate(
      "delivered item has order reference",
      sampleDelivered.order !== undefined,
    );
    TestValidator.predicate(
      "delivered item has productVariant reference",
      sampleDelivered.productVariant !== undefined,
    );
    TestValidator.predicate(
      "delivered item has seller reference",
      sampleDelivered.seller !== undefined,
    );
  }
}
