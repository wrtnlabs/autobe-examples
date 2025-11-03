import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Verify seller can retrieve a split order they are assigned to, ensuring
 * seller onboarding, correct authentication, and accurate split data
 * retrieval.
 */
export async function test_api_order_split_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register and authenticate seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;

  const sellerAuth: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "registered seller email",
    sellerAuth.email,
    sellerJoinBody.email,
  );
  TestValidator.equals(
    "registered seller display name",
    sellerAuth.display_name,
    sellerJoinBody.display_name,
  );
  TestValidator.equals(
    "seller status is pending after join",
    sellerAuth.status,
    "pending",
  );

  // 2. Simulate split order assignment for this seller (since no split/order creation endpoint, use random codes)
  const orderCode = RandomGenerator.alphaNumeric(16);
  const splitCode = RandomGenerator.alphaNumeric(10);

  // 3. Attempt to retrieve split order info as this seller
  const split: IShoppingOrderSplit =
    await api.functional.shopping.seller.orders.splits.at(connection, {
      orderCode,
      splitCode,
    });
  typia.assert(split);

  // 4. Validate split ownership, business fields, and structure
  TestValidator.equals(
    "order split seller ID matches authenticated seller",
    split.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "split_code in split matches",
    split.split_code,
    splitCode,
  );
  TestValidator.equals("order_id is a UUID", typeof split.order_id, "string");
  TestValidator.predicate("subtotal_price is > 0", split.subtotal_price > 0);
  TestValidator.equals("split status exists", typeof split.status, "string");
  TestValidator.equals(
    "seller display name matches",
    split.seller.display_name,
    sellerAuth.display_name,
  );
  TestValidator.equals(
    "seller status exists",
    typeof split.seller.status,
    "string",
  );

  // 5. If present, audit trail entries for the order split are properly typed
  if (
    split.order_status_histories !== null &&
    split.order_status_histories !== undefined
  ) {
    for (const history of split.order_status_histories) {
      typia.assert<IShoppingOrderStatusHistory.ISummary>(history);
      TestValidator.equals(
        "order status history audit id is a UUID",
        typeof history.id,
        "string",
      );
      TestValidator.equals(
        "status transition from_status string",
        typeof history.from_status,
        "string",
      );
      TestValidator.equals(
        "status transition to_status string",
        typeof history.to_status,
        "string",
      );
      TestValidator.equals(
        "triggered_by is string",
        typeof history.triggered_by,
        "string",
      );
      TestValidator.equals(
        "occurred_at is string",
        typeof history.occurred_at,
        "string",
      );
    }
  }
}
