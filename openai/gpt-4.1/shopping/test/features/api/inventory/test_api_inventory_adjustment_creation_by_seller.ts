import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAdjustment";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Test seller inventory adjustment creation business rules.
 *
 * 1. Register a new seller and authenticate.
 * 2. Create a unique SKU code and initial inventory via adjustment (restock,
 *    positive amount).
 * 3. Increase inventory again for the same SKU (restock again; inventory should
 *    increase).
 * 4. Decrease inventory by valid amount (deduct).
 * 5. Attempt decrease that would result in negative inventory (should fail; error
 *    expected).
 * 6. Register a different seller and try to adjust the SKU (should fail; error
 *    expected due to lack of ownership).
 * 7. After successful adjustments, verify audit log values (actor_id, reason_code,
 *    quantities) and resulting stock values are coherent and consistent.
 */
export async function test_api_inventory_adjustment_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller and authenticate
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 2. Create unique SKU code and restock (initial inventory adjustment)
  const skuCode = RandomGenerator.alphaNumeric(12);
  const initialRestockAmount = 20;
  const initialAdjustmentBody = {
    sku_code: skuCode,
    adjustment_amount: initialRestockAmount,
    reason_code: "manual_restock",
    actor_type: "seller",
  } satisfies IShoppingInventoryAdjustment.ICreate;
  const firstAdjustment =
    await api.functional.shopping.seller.inventory.adjustments.create(
      connection,
      {
        skuCode,
        body: initialAdjustmentBody,
      },
    );
  typia.assert(firstAdjustment);
  TestValidator.equals(
    "first restock adjustment amount",
    firstAdjustment.adjustment_amount,
    initialRestockAmount,
  );
  TestValidator.equals(
    "inventory quantity after first restock",
    firstAdjustment.quantity_after,
    initialRestockAmount,
  );
  TestValidator.equals(
    "audit log actor type",
    firstAdjustment.actor_type,
    "seller",
  );
  TestValidator.equals(
    "audit log actor id matches",
    firstAdjustment.actor_id,
    seller.id,
  );
  TestValidator.equals(
    "reason code in audit log",
    firstAdjustment.reason_code,
    initialAdjustmentBody.reason_code,
  );

  // 3. Second restock (increase again)
  const increaseAmount = 5;
  const increaseAdjustmentBody = {
    sku_code: skuCode,
    adjustment_amount: increaseAmount,
    reason_code: "manual_restock",
    actor_type: "seller",
    context_note: "Second restock",
  } satisfies IShoppingInventoryAdjustment.ICreate;
  const secondAdjustment =
    await api.functional.shopping.seller.inventory.adjustments.create(
      connection,
      {
        skuCode,
        body: increaseAdjustmentBody,
      },
    );
  typia.assert(secondAdjustment);
  TestValidator.equals(
    "cumulative restock quantity_after",
    secondAdjustment.quantity_after,
    firstAdjustment.quantity_after + increaseAmount,
  );
  TestValidator.equals(
    "cumulative quantity_before equals previous after",
    secondAdjustment.quantity_before,
    firstAdjustment.quantity_after,
  );
  TestValidator.equals(
    "second restock adjustment_amount",
    secondAdjustment.adjustment_amount,
    increaseAmount,
  );

  // 4. Valid decrease (reduce inventory)
  const validDecreaseAmount = -8;
  const decreaseAdjustmentBody = {
    sku_code: skuCode,
    adjustment_amount: validDecreaseAmount,
    reason_code: "correction",
    actor_type: "seller",
    context_note: "Reduce stock for warehouse counting error",
  } satisfies IShoppingInventoryAdjustment.ICreate;
  const thirdAdjustment =
    await api.functional.shopping.seller.inventory.adjustments.create(
      connection,
      {
        skuCode,
        body: decreaseAdjustmentBody,
      },
    );
  typia.assert(thirdAdjustment);
  TestValidator.equals(
    "decrease quantity_before",
    thirdAdjustment.quantity_before,
    secondAdjustment.quantity_after,
  );
  TestValidator.equals(
    "decrease adjustment_amount",
    thirdAdjustment.adjustment_amount,
    validDecreaseAmount,
  );
  TestValidator.equals(
    "decrease quantity_after",
    thirdAdjustment.quantity_after,
    secondAdjustment.quantity_after + validDecreaseAmount,
  );

  // 5. Attempt invalid decrease to negative inventory (should error)
  const invalidDecreaseAmount = -(thirdAdjustment.quantity_after + 1);
  const invalidDecreaseBody = {
    sku_code: skuCode,
    adjustment_amount: invalidDecreaseAmount,
    reason_code: "correction",
    actor_type: "seller",
  } satisfies IShoppingInventoryAdjustment.ICreate;
  await TestValidator.error(
    "seller cannot reduce inventory to negative",
    async () => {
      await api.functional.shopping.seller.inventory.adjustments.create(
        connection,
        {
          skuCode,
          body: invalidDecreaseBody,
        },
      );
    },
  );

  // 6. Register another seller and attempt adjustment on the SKU (should error)
  const anotherSellerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const anotherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: anotherSellerEmail,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(anotherSeller);
  const adjustmentByNonOwner = {
    sku_code: skuCode,
    adjustment_amount: 3,
    reason_code: "manual_restock",
    actor_type: "seller",
  } satisfies IShoppingInventoryAdjustment.ICreate;
  await TestValidator.error("non-owner seller cannot adjust SKU", async () => {
    await api.functional.shopping.seller.inventory.adjustments.create(
      connection,
      {
        skuCode,
        body: adjustmentByNonOwner,
      },
    );
  });
}
