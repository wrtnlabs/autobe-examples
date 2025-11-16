import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerification";

/**
 * Validates that an admin can update a seller's business verification record,
 * including status transitions, reviewer assignment, compliance document
 * updates, and admin note/reason changes. Also ensures business logic is
 * enforced, updates are reflected in the response, and forbidden/not-found
 * scenarios are properly handled.
 *
 * Steps:
 *
 * 1. Create and authenticate as admin.
 * 2. Generate random sellerId and verificationId (since no creation endpoints
 *    exist).
 * 3. Attempt update with all fields in the update schema (status, reviewer
 *    assignment, note, docs, reviewed_at).
 * 4. Check that update succeeds and response fields are correctly updated.
 * 5. Attempt update with unassigned reviewer_admin_id and status transition (test
 *    null/undefined handling).
 * 6. Attempt update for non-existent verification (should error).
 */
export async function test_api_seller_verification_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "A!1",
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(admin);

  // 2. Generate random sellerId and verificationId (simulate existing entities)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const verificationId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare update input using all fields in IShoppingMallSellerVerification.IUpdate
  const now = new Date().toISOString();
  const updateInput = {
    status: RandomGenerator.pick([
      "approved",
      "rejected",
      "needs_more_info",
      "under_review",
      "pending",
    ]),
    compliance_documents: RandomGenerator.paragraph({ sentences: 2 }),
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    reviewed_at: now,
    reviewer_admin_id: admin.id,
  } satisfies IShoppingMallSellerVerification.IUpdate;

  // 4. Perform the update
  const updated: IShoppingMallSellerVerification =
    await api.functional.shoppingMall.admin.sellers.verifications.update(
      connection,
      {
        sellerId,
        verificationId,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 5. Assertions: The response should reflect our update
  TestValidator.equals("updated status", updated.status, updateInput.status);
  TestValidator.equals(
    "updated compliance_documents",
    updated.compliance_documents,
    updateInput.compliance_documents,
  );
  TestValidator.equals("updated reason", updated.reason, updateInput.reason);
  TestValidator.equals(
    "reviewed_at matches",
    updated.reviewed_at,
    updateInput.reviewed_at,
  );
  if (updated.reviewer_admin) {
    TestValidator.equals(
      "updated reviewer_admin.id",
      updated.reviewer_admin.id,
      updateInput.reviewer_admin_id,
    );
  }

  // 6. Test null reviewer_admin_id & compliance_documents handling (should clear fields if supported by API)
  const updateNullInput = {
    reviewer_admin_id: null,
    compliance_documents: null,
    reason: null,
    status: "pending",
    reviewed_at: null,
  } satisfies IShoppingMallSellerVerification.IUpdate;
  const updatedNull =
    await api.functional.shoppingMall.admin.sellers.verifications.update(
      connection,
      {
        sellerId,
        verificationId,
        body: updateNullInput,
      },
    );
  typia.assert(updatedNull);
  TestValidator.equals(
    "reviewer_admin cleared",
    updatedNull.reviewer_admin,
    null,
  );
  TestValidator.equals(
    "compliance_documents cleared",
    updatedNull.compliance_documents,
    null,
  );
  TestValidator.equals("reason cleared", updatedNull.reason, null);
  TestValidator.equals(
    "status updated to pending",
    updatedNull.status,
    updateNullInput.status,
  );

  // 7. Forbidden/not-found test: using a different random verificationId should fail
  const invalidVerificationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update for invalid verificationId should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellers.verifications.update(
        connection,
        {
          sellerId,
          verificationId: invalidVerificationId,
          body: updateInput,
        },
      );
    },
  );
}
