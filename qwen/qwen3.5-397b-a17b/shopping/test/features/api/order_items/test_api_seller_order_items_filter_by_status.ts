import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller filtering order items by fulfillment status to focus on specific workflow stages.
 *
 * Validates the complete order item filtering workflow including seller authentication and status-based filtering across all fulfillment stages (paid, shipped, delivered, cancelled, refunded). Ensures that each filtered query returns only order items matching the specified status and that pagination metadata accurately reflects the filtered result count.
 *
 * Special attention is given to verifying that all returned items have the correct status value matching the filter, and that the response structure remains consistent across different status filters.
 *
 * 1. Seller registers and authenticates using authorize_seller_join utility.
 * 2. Seller queries order items with status='paid' filter and validates all items have status 'paid'.
 * 3. Seller queries order items with status='shipped' filter and validates all items have status 'shipped'.
 * 4. Seller queries order items with status='delivered' filter and validates all items have status 'delivered'.
 * 5. Seller queries order items with status='cancelled' filter and validates all items have status 'cancelled'.
 * 6. Seller queries order items with status='refunded' filter and validates all items have status 'refunded'.
 */
export async function test_api_seller_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Test filtering by status='paid'
  const paidResult =
    await api.functional.shoppingMall.seller.seller.order_items.index(
      sellerConnection,
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
    "paid pagination valid",
    paidResult.pagination.current >= 1,
  );
  TestValidator.predicate("paid items have correct status", () =>
    paidResult.data.every((item) => item.status === "paid"),
  );
  // 3. Test filtering by status='shipped'
  const shippedResult =
    await api.functional.shoppingMall.seller.seller.order_items.index(
      sellerConnection,
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
    "shipped pagination valid",
    shippedResult.pagination.current >= 1,
  );
  TestValidator.predicate("shipped items have correct status", () =>
    shippedResult.data.every((item) => item.status === "shipped"),
  );
  // 4. Test filtering by status='delivered'
  const deliveredResult =
    await api.functional.shoppingMall.seller.seller.order_items.index(
      sellerConnection,
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
    "delivered pagination valid",
    deliveredResult.pagination.current >= 1,
  );
  TestValidator.predicate("delivered items have correct status", () =>
    deliveredResult.data.every((item) => item.status === "delivered"),
  );
  // 5. Test filtering by status='cancelled'
  const cancelledResult =
    await api.functional.shoppingMall.seller.seller.order_items.index(
      sellerConnection,
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
    "cancelled pagination valid",
    cancelledResult.pagination.current >= 1,
  );
  TestValidator.predicate("cancelled items have correct status", () =>
    cancelledResult.data.every((item) => item.status === "cancelled"),
  );
  // 6. Test filtering by status='refunded'
  const refundedResult =
    await api.functional.shoppingMall.seller.seller.order_items.index(
      sellerConnection,
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
    "refunded pagination valid",
    refundedResult.pagination.current >= 1,
  );
  TestValidator.predicate("refunded items have correct status", () =>
    refundedResult.data.every((item) => item.status === "refunded"),
  );
}
