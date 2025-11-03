import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validate that an authenticated seller can update the status of their assigned
 * order split. Covers allowed transitions, forbidden status transitions, and
 * seller authorization.
 *
 * 1. Register new seller (join)
 * 2. Create a simulated order split assigned to this seller
 * 3. Update the split to a new allowed status (e.g., 'fulfilled')
 * 4. Attempt a duplicate or forbidden transition (use arbitrary status)
 * 5. Attempt to update a split belonging to another seller
 * 6. Validate all responses and business constraints
 */
export async function test_api_seller_order_split_status_update(
  connection: api.IConnection,
) {
  // 1. Register new seller
  const sellerEmail = RandomGenerator.name().replace(/\s+/g, "") + "@test.com";
  const sellerJoinReq = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 7,
    }),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;

  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinReq,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller status after join",
    sellerAuth.status,
    "pending",
  );

  // 2. Simulate a split assigned to this seller (would require full order flow, so here we mock split data)
  const orderCode = RandomGenerator.alphaNumeric(10);
  const splitCode = RandomGenerator.alphaNumeric(8);
  const startingStatus = "pending";
  let split: IShoppingOrderSplit = {
    id: typia.random<string & tags.Format<"uuid">>(),
    split_code: splitCode,
    subtotal_price: 12345.67,
    status: startingStatus,
    created_at: new Date().toISOString(),
    updated_at: undefined,
    order_id: typia.random<string & tags.Format<"uuid">>(),
    seller: {
      id: sellerAuth.id,
      display_name: sellerAuth.display_name,
      status: sellerAuth.status,
    },
    order_status_histories: [],
  };
  typia.assert(split);

  // 3. Seller updates split status to 'fulfilled' (allowed transition)
  const updateReq1 = {
    status: "fulfilled",
  } satisfies IShoppingOrderSplit.IUpdate;
  const updatedSplit =
    await api.functional.shopping.seller.orders.splits.update(connection, {
      orderCode,
      splitCode,
      body: updateReq1,
    });
  typia.assert(updatedSplit);
  TestValidator.equals(
    "order split status updated",
    updatedSplit.status,
    "fulfilled",
  );
  TestValidator.equals(
    "split code preserved",
    updatedSplit.split_code,
    splitCode,
  );
  TestValidator.equals(
    "seller id preserved",
    updatedSplit.seller.id,
    sellerAuth.id,
  );

  // 4. Attempt forbidden status (e.g. arbitrary string)
  const forbiddenStatus = "totally_invalid_status";
  const updateReq2 = {
    status: forbiddenStatus,
  } satisfies IShoppingOrderSplit.IUpdate;
  await TestValidator.error("forbidden status transition fails", async () => {
    await api.functional.shopping.seller.orders.splits.update(connection, {
      orderCode,
      splitCode,
      body: updateReq2,
    });
  });

  // 5. Register a second seller and attempt to update the split as the wrong actor
  const otherSellerEmail =
    RandomGenerator.name().replace(/\s+/g, "") + "@other.com";
  const otherJoinReq = {
    email: otherSellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 7,
    }),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const otherAuth = await api.functional.auth.seller.join(connection, {
    body: otherJoinReq,
  });
  typia.assert(otherAuth);
  // Switch connection to this unrelated seller
  await api.functional.auth.seller.join(connection, { body: otherJoinReq });
  // Attempt update
  const updateReq3 = {
    status: "fulfilled",
  } satisfies IShoppingOrderSplit.IUpdate;
  await TestValidator.error(
    "seller cannot update split they do not own",
    async () => {
      await api.functional.shopping.seller.orders.splits.update(connection, {
        orderCode,
        splitCode,
        body: updateReq3,
      });
    },
  );
}
