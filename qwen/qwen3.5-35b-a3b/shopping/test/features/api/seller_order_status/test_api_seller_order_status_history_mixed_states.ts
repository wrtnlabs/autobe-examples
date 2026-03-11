import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_order_status_history_mixed_states(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection with token
  const sellerTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuth.token.access },
  };
  // 3. Get status history for an order
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const statusHistory =
    await api.functional.ecommerceMall.seller.orders.items.status_history.statusHistory(
      sellerTokenConnection,
      { orderId },
    );
  typia.assert(statusHistory);
  // 4. Validate item status is one of the valid states
  const validItemStatuses: (
    | "paid"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"
  )[] = ["paid", "shipped", "delivered", "cancelled", "refunded"];
  TestValidator.predicate(
    "item status is valid",
    validItemStatuses.includes(statusHistory.itemStatus),
  );
  // 5. Validate status history entries exist and are ordered chronologically
  const statusHistoryEntries = statusHistory.statusHistory;
  TestValidator.predicate(
    "status history has entries",
    statusHistoryEntries.length >= 1,
  );
  // 6. Validate each status history entry structure and transitions
  const validStatuses: (
    | "paid"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"
  )[] = ["paid", "shipped", "delivered", "cancelled", "refunded"];
  for (let i = 0; i < statusHistoryEntries.length; i++) {
    const entry = statusHistoryEntries[i];
    // 7. Validate first entry has null oldStatus (initial state)
    if (i === 0) {
      TestValidator.equals(
        "first entry oldStatus is null",
        entry.oldStatus,
        null,
      );
    }
    // 8. Validate newStatus is one of the valid states
    TestValidator.predicate(
      "entry newStatus is valid",
      validStatuses.includes(entry.newStatus),
    );
    // 9. Validate changedBy is present and non-empty
    TestValidator.predicate(
      "entry changedBy is present",
      entry.changedBy !== null &&
        entry.changedBy !== undefined &&
        entry.changedBy.length > 0,
    );
    // 10. Validate chronological order (each entry should be after previous)
    if (i > 0) {
      const previousEntry = statusHistoryEntries[i - 1];
      TestValidator.predicate(
        "entry timestamp is after previous",
        new Date(entry.changedAt) > new Date(previousEntry.changedAt),
      );
    }
  }
  // 11. Validate product summary structure
  TestValidator.equals(
    "product has id",
    statusHistory.product.id !== null,
    true,
  );
  TestValidator.equals(
    "product has name",
    statusHistory.product.name.length > 0,
    true,
  );
  TestValidator.equals(
    "product has category",
    statusHistory.product.category !== null,
    true,
  );
  TestValidator.equals(
    "product has seller",
    statusHistory.product.seller !== null,
    true,
  );
  TestValidator.equals(
    "product has isActive flag",
    typeof statusHistory.product.isActive === "boolean",
    true,
  );
  // 12. Validate variant summary structure
  TestValidator.equals(
    "variant has id",
    statusHistory.variant.id !== null,
    true,
  );
  TestValidator.equals(
    "variant has skuCode",
    statusHistory.variant.skuCode.length > 0,
    true,
  );
  TestValidator.equals(
    "variant has stockQuantity",
    statusHistory.variant.stockQuantity >= 0,
    true,
  );
  TestValidator.equals(
    "variant has isActive flag",
    typeof statusHistory.variant.isActive === "boolean",
    true,
  );
  // 13. Validate item quantity and price
  TestValidator.predicate("quantity is positive", statusHistory.quantity > 0);
  TestValidator.predicate(
    "unitPrice is non-negative",
    statusHistory.unitPrice >= 0,
  );
  // 14. Validate timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "createdAt is valid date-time",
    !isNaN(new Date(statusHistory.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    !isNaN(new Date(statusHistory.updatedAt).getTime()),
  );
}
