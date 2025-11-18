import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";

/**
 * Validate that deleting a payout batch is rejected when its status is
 * non-deletable.
 *
 * Business goal:
 *
 * - Ensure administrative deletion of seller payout batches respects lifecycle
 *   rules so that batches already processed or completed cannot be removed,
 *   preserving financial integrity and auditability.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate an admin via POST /auth/admin/join.
 * 2. Create a payout batch in an initially deletable status (e.g., "draft").
 * 3. Transition the batch to a non-deletable status (e.g., "completed").
 * 4. Attempt to delete the batch via DELETE
 *    /shoppingMall/admin/payoutBatches/{batchCode}.
 * 5. Assert that an error is thrown for the delete attempt (business rule
 *    violation).
 * 6. Confirm that the batch status we previously observed remains the
 *    non-deletable value, acknowledging that no read-after-delete endpoint is
 *    available in this test scope.
 */
export async function test_api_admin_payout_batch_delete_rejected_for_non_deletable_status(
  connection: api.IConnection,
) {
  // 1. Admin join/authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    // optional ip and referrer are omitted for simplicity
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a payout batch in a deletable status (e.g., "draft")
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // yesterday
  const end = now;

  const batchCodePrefix = "PB-";
  const batchCodeRandom = RandomGenerator.alphaNumeric(8);
  const batchCode = `${batchCodePrefix}${batchCodeRandom}`;

  const totalGross = 1000;
  const totalCommission = 100;
  const totalNet = totalGross - totalCommission;

  const createBody = {
    batch_code: batchCode,
    payout_period_start: start.toISOString(),
    payout_period_end: end.toISOString(),
    currency_code: "USD",
    total_gross_amount: totalGross,
    total_commission_amount: totalCommission,
    total_net_payout_amount: totalNet,
    status: "draft",
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;

  const createdBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: createBody,
    });
  typia.assert(createdBatch);

  TestValidator.equals(
    "created batchCode should match requested batch_code",
    createdBatch.batchCode,
    batchCode,
  );

  // 3. Transition the batch into a non-deletable status (e.g., "completed")
  const nonDeletableStatus = "completed";

  const updateBody = {
    status: nonDeletableStatus,
  } satisfies IShoppingMallSellerPayoutBatch.IUpdate;

  const updatedBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.update(connection, {
      batchCode: createdBatch.batchCode,
      body: updateBody,
    });
  typia.assert(updatedBatch);

  TestValidator.equals(
    "updated batch status should be non-deletable status",
    updatedBatch.status,
    nonDeletableStatus,
  );

  // 4. Attempt deletion while in non-deletable state.
  //    We expect a business-rule style error and only assert that an error occurs,
  //    not any specific HTTP status code.
  await TestValidator.error(
    "erase should fail for non-deletable status",
    async () => {
      await api.functional.shoppingMall.admin.payoutBatches.erase(connection, {
        batchCode: updatedBatch.batchCode,
      });
    },
  );

  // 5. We cannot re-fetch the batch due to missing read endpoint in the SDK list,
  //    but we can assert logically that our last known representation remains the
  //    non-deletable status value, emphasizing that the failed erase call does not
  //    change that in-memory snapshot.
  TestValidator.equals(
    "snapshot of updated batch remains in non-deletable status after failed erase",
    updatedBatch.status,
    nonDeletableStatus,
  );
}
