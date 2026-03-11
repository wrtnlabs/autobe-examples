import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_item_status_history_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Get order item status history with random order ID
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const statusHistory =
    await api.functional.ecommerceMall.admin.orders.items.status_history.statusHistory(
      adminConnection,
      { orderId },
    );
  typia.assert(statusHistory);
  // 3. Validate response structure with typia.assert above
  // 4. Validate item fields are present and have valid values
  const item = statusHistory;
  TestValidator.equals("item has UUID id", item.id !== undefined, true);
  TestValidator.predicate("item quantity is at least 1", item.quantity >= 1);
  TestValidator.predicate(
    "item unit price is non-negative",
    item.unitPrice >= 0,
  );
  // 5. Validate status is one of the valid statuses
  const validStatuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  TestValidator.predicate(
    "item status is valid",
    validStatuses.includes(item.itemStatus),
  );
  // 6. Validate product details are present
  TestValidator.predicate("product has id", item.product.id !== undefined);
  TestValidator.predicate("product has name", item.product.name.length > 0);
  TestValidator.predicate(
    "product has base price",
    item.product.basePrice !== undefined,
  );
  TestValidator.predicate(
    "product has category",
    item.product.category !== undefined,
  );
  TestValidator.predicate(
    "product has seller",
    item.product.seller !== undefined,
  );
  TestValidator.predicate(
    "product is active",
    item.product.isActive !== undefined,
  );
  // 7. Validate variant details are present
  TestValidator.predicate("variant has id", item.variant.id !== undefined);
  TestValidator.predicate("variant has SKU", item.variant.skuCode.length > 0);
  TestValidator.predicate(
    "variant has options",
    item.variant.optionValues.length > 0,
  );
  TestValidator.predicate("variant has stock", item.variant.stockQuantity >= 0);
  TestValidator.predicate(
    "variant is active",
    item.variant.isActive !== undefined,
  );
  TestValidator.predicate(
    "variant has parent product",
    item.variant.product !== undefined,
  );
  // 8. Validate status history entries if present
  if (item.statusHistory && item.statusHistory.length > 0) {
    // Validate first entry has newStatus
    const firstEntry = item.statusHistory[0];
    TestValidator.predicate(
      "status history entry has newStatus",
      firstEntry.newStatus !== undefined,
    );
    // Validate chronological ordering
    for (let i = 1; i < item.statusHistory.length; i++) {
      const currentEntry = item.statusHistory[i];
      const prevEntry = item.statusHistory[i - 1];
      const currentTimestamp = new Date(currentEntry.changedAt).getTime();
      const prevTimestamp = new Date(prevEntry.changedAt).getTime();
      TestValidator.predicate(
        `status history is ordered at index ${i}`,
        currentTimestamp >= prevTimestamp,
      );
    }
    // Validate status transitions are valid
    item.statusHistory.forEach((entry) => {
      TestValidator.predicate(
        "status history entry has oldStatus",
        entry.oldStatus === undefined ||
          validStatuses.includes(entry.oldStatus),
      );
      TestValidator.predicate(
        "status history entry has newStatus",
        validStatuses.includes(entry.newStatus),
      );
      TestValidator.predicate(
        "status history entry has changedAt",
        entry.changedAt !== undefined,
      );
      TestValidator.predicate(
        "status history entry has changedBy",
        entry.changedBy.length > 0,
      );
    });
  }
}
