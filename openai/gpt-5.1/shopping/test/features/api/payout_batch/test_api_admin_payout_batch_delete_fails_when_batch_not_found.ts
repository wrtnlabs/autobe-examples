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
 * Validate that deleting a non-existent seller payout batch fails for admin.
 *
 * Business context: Administrative and finance users manage seller settlements
 * via payout batches. Each payout batch is identified by a human-readable
 * batchCode and persisted in shopping_mall_seller_payout_batches. Deleting a
 * batch is a privileged operation that should only succeed for existing,
 * allowed batches. When an admin attempts to delete a batch by a batchCode that
 * does not exist, the API must return an error instead of silently succeeding
 * or accidentally affecting other batches.
 *
 * This E2E test focuses on the negative path: calling the DELETE
 * /shoppingMall/admin/payoutBatches/{batchCode} endpoint with a clearly
 * non-existent batchCode and verifying that the SDK surfaces an error. It also
 * ensures that a valid, existing payout batch created beforehand is not used in
 * the deletion attempt, so there is no risk of accidentally deleting it during
 * the test.
 *
 * Step-by-step process:
 *
 * 1. Admin join & authentication
 *
 *    - Call api.functional.auth.admin.join with a random, valid
 *         IShoppingMallAdminJoin.ICreate payload.
 *    - This both creates an admin account and configures the connection with an
 *         Authorization header via the SDK.
 *    - Assert the returned IShoppingMallAdmin.IAuthorized payload with typia.assert
 *         to guarantee correct typing.
 * 2. Create a baseline payout batch
 *
 *    - Call api.functional.shoppingMall.admin.payoutBatches.create with a valid
 *         IShoppingMallSellerPayoutBatch.ICreate body.
 *    - The body can be generated via
 *         typia.random<IShoppingMallSellerPayoutBatch.ICreate>(). This ensures
 *         all required numeric and date-time fields are populated with
 *         syntactically valid values.
 *    - Capture the returned IShoppingMallSellerPayoutBatch and assert it via
 *         typia.assert. Store its batchCode separately to guarantee we do not
 *         use it for the failing delete case.
 * 3. Build a guaranteed non-existent batchCode
 *
 *    - Construct a synthetic batchCode string that is extremely unlikely to collide
 *         with any real batch, such as a fixed prefix plus a random UUID or
 *         random alphanumeric string.
 *    - For example: `NON_EXISTENT_BATCH_${RandomGenerator.alphaNumeric(16)}`.
 *    - Additionally ensure it is different from the created batch's batchCode using
 *         a TestValidator.notEquals assertion.
 * 4. Attempt to delete the non-existent payout batch
 *
 *    - Invoke api.functional.shoppingMall.admin.payoutBatches.erase with the
 *         synthetic non-existent batchCode.
 *    - Wrap the call in TestValidator.error with an async closure and a descriptive
 *         title such as "delete non-existent payout batch should fail" to
 *         assert that the SDK throws an error.
 *    - In line with global guidelines, we do not assert specific HttpError status
 *         codes or error payload details; only that an error occurs.
 * 5. Sanity checks and invariants
 *
 *    - Use TestValidator.notEquals to assert that the non-existent batchCode differs
 *         from the real batch's batchCode.
 *    - Optionally assert that the created batch payload is still a valid
 *         IShoppingMallSellerPayoutBatch instance via typia.assert, which we
 *         already did at creation time. Since no read/list endpoint is
 *         available in the provided SDK, we cannot re-fetch the batch for a
 *         stronger "not deleted" assertion, but the absence of its batchCode in
 *         the erase call ensures we did not target it.
 */
export async function test_api_admin_payout_batch_delete_fails_when_batch_not_found(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a baseline payout batch
  const createBody = typia.random<IShoppingMallSellerPayoutBatch.ICreate>();
  const existingBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: createBody,
    });
  typia.assert(existingBatch);

  // 3. Build a guaranteed non-existent batchCode
  const nonExistentBatchCode = `NON_EXISTENT_BATCH_${RandomGenerator.alphaNumeric(16)}`;

  TestValidator.notEquals(
    "non-existent batchCode must differ from existing batch code",
    existingBatch.batchCode,
    nonExistentBatchCode,
  );

  // 4. Attempt to delete the non-existent payout batch
  await TestValidator.error(
    "delete non-existent payout batch should fail",
    async () => {
      await api.functional.shoppingMall.admin.payoutBatches.erase(connection, {
        batchCode: nonExistentBatchCode,
      });
    },
  );
}
