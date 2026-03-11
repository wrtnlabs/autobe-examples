import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_items_status_history_cancelled_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins to create account
  const joinConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: "12345678",
      href: "https://test.example.com/join",
      referrer: "https://test.example.com/",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create authenticated connection for customer API calls
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: customer.token.access };
  // 3. Retrieve status history for a pre-existing order with cancelled item
  // Assuming test database has pre-seeded orders with cancelled items
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const statusHistory =
    await api.functional.ecommerceMall.customer.orders.items.status_history.statusHistory(
      customerConnection,
      { orderId },
    );
  typia.assert(statusHistory);
  // 4. Verify status history contains entries
  TestValidator.predicate(
    "has status history",
    statusHistory.statusHistory.length > 0,
  );
  TestValidator.equals(
    "item status is cancelled",
    statusHistory.itemStatus,
    "cancelled",
  );
  // 5. Verify cancelled transition exists in history
  const cancelledEntry = statusHistory.statusHistory.find(
    (entry) => entry.newStatus === "cancelled",
  );
  TestValidator.predicate(
    "has cancelled entry in history",
    cancelledEntry !== undefined,
  );
  if (cancelledEntry) {
    // 6. Verify cancelled entry has proper timestamps and actor info
    TestValidator.equals(
      "cancelled entry has changedAt timestamp",
      typeof cancelledEntry.changedAt,
      "string",
    );
    TestValidator.equals(
      "cancelled entry has changedBy actor",
      typeof cancelledEntry.changedBy,
      "string",
    );
  }
  // 7. Verify previous status before cancellation (paid or shipped)
  TestValidator.predicate(
    "previous status before cancellation is valid",
    cancelledEntry?.oldStatus === "paid" ||
      cancelledEntry?.oldStatus === "shipped",
  );
  // 8. Verify chronological order - cancelled should be one of the later entries
  const cancelledIndex = statusHistory.statusHistory.findIndex(
    (entry) => entry.newStatus === "cancelled",
  );
  TestValidator.predicate(
    "cancelled entry is not the first entry",
    cancelledIndex > 0,
  );
  // 9. Verify product details are included
  TestValidator.predicate(
    "has product name",
    statusHistory.product.name.length > 0,
  );
  TestValidator.predicate(
    "has variant SKU",
    statusHistory.variant.skuCode.length > 0,
  );
}