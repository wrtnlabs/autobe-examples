import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that an admin can successfully update the details, status, subject,
 * root cause, or resolution note of an existing shopping mall dispute.
 *
 * This test covers the full e2e workflow:
 *
 * 1. Create two admin accounts to allow reassignment
 * 2. Register a new dispute using admin #1
 * 3. Admin #1 updates the dispute with new subject/root cause
 * 4. Admin #1 transitions the dispute status (e.g., open → investigating →
 *    resolved → closed)
 * 5. Reassign to admin #2, verify admin assignment is updated
 * 6. Add a resolution note and verify it is updated and persists
 * 7. Attempt an unauthorized update (e.g., using wrong admin ID) and confirm
 *    update is NOT permitted
 * 8. For every update, check that status changes, admin assignment, and audit
 *    fields (updated_at) are reflected and correct business rules are enforced
 */
export async function test_api_dispute_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Create two admin accounts to allow admin assignment and transitions
  const admin1Email = RandomGenerator.name(1) + "1@admin.com";
  const admin2Email = RandomGenerator.name(1) + "2@admin.com";
  const adminPassword = "AdminPass123!";
  const admin1Name = RandomGenerator.name();
  const admin2Name = RandomGenerator.name();

  const admin1: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: admin1Email satisfies string,
        password: adminPassword satisfies string,
        name: admin1Name satisfies string,
      },
    });
  typia.assert(admin1);

  // Register a second admin account (to test reassignment)
  const admin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: admin2Email satisfies string,
        password: adminPassword satisfies string,
        name: admin2Name satisfies string,
      },
    });
  typia.assert(admin2);

  // Prepare required customer and seller summary objects for dispute
  const customer: IShoppingMallCustomer.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(1),
  };
  const seller: IShoppingMallSeller.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
  };

  // 2. Register a new dispute using admin #1
  const disputeCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    shopping_mall_admin_id: admin1.id,
    status: "open",
    subject: "Initial subject",
    root_cause: "Original cause",
  } satisfies IShoppingMallDispute.ICreate;
  const initialDispute: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.create(connection, {
      body: disputeCreateBody,
    });
  typia.assert(initialDispute);
  TestValidator.equals(
    "dispute status after creation is open",
    initialDispute.status,
    "open",
  );
  TestValidator.equals(
    "created dispute subject",
    initialDispute.subject,
    disputeCreateBody.subject,
  );
  TestValidator.equals(
    "created dispute root_cause",
    initialDispute.root_cause,
    disputeCreateBody.root_cause,
  );
  TestValidator.equals(
    "admin id is assigned",
    initialDispute.admin && initialDispute.admin.id,
    admin1.id,
  );

  // Save original updated_at for audit comparison
  const originalUpdatedAt = initialDispute.updated_at;

  // 3. Admin #1 updates the dispute subject and root_cause
  const updateBody1 = {
    subject: "Updated subject by admin1",
    root_cause: "Updated root cause by admin1",
  } satisfies IShoppingMallDispute.IUpdate;
  const updatedDispute1 =
    await api.functional.shoppingMall.admin.disputes.update(connection, {
      disputeId: initialDispute.id,
      body: updateBody1,
    });
  typia.assert(updatedDispute1);
  TestValidator.equals(
    "subject updated",
    updatedDispute1.subject,
    updateBody1.subject,
  );
  TestValidator.equals(
    "root_cause updated",
    updatedDispute1.root_cause,
    updateBody1.root_cause,
  );
  TestValidator.notEquals(
    "updated_at must be changed after update",
    updatedDispute1.updated_at,
    originalUpdatedAt,
  );

  // 4. Admin #1 transitions the dispute status: open → investigating → resolved → closed
  const statusTransitions = ["investigating", "resolved", "closed"];
  let lastStatus = updatedDispute1.status;
  let currentDisputeId = initialDispute.id;
  let latestDispute = updatedDispute1;
  for (const newStatus of statusTransitions) {
    const updateStatusBody = {
      status: newStatus,
    } satisfies IShoppingMallDispute.IUpdate;
    const result = await api.functional.shoppingMall.admin.disputes.update(
      connection,
      {
        disputeId: currentDisputeId,
        body: updateStatusBody,
      },
    );
    typia.assert(result);
    TestValidator.equals(
      `status transition to ${newStatus}`,
      result.status,
      newStatus,
    );
    TestValidator.notEquals(
      "updated_at must change each time",
      result.updated_at,
      latestDispute.updated_at,
    );
    latestDispute = result;
    lastStatus = result.status;
  }

  // 5. Reassign to admin #2; verify admin assignment
  const updateAssignAdminBody = {
    shopping_mall_admin_id: admin2.id,
  } satisfies IShoppingMallDispute.IUpdate;
  const reassignedDispute =
    await api.functional.shoppingMall.admin.disputes.update(connection, {
      disputeId: currentDisputeId,
      body: updateAssignAdminBody,
    });
  typia.assert(reassignedDispute);
  TestValidator.equals(
    "dispute admin reassignment",
    reassignedDispute.admin && reassignedDispute.admin.id,
    admin2.id,
  );

  // 6. Add a resolution note
  const resolutionNoteBody = {
    resolution_note: "Resolved. Item delivered after admin intervention.",
  } satisfies IShoppingMallDispute.IUpdate;
  const resolvedDispute =
    await api.functional.shoppingMall.admin.disputes.update(connection, {
      disputeId: currentDisputeId,
      body: resolutionNoteBody,
    });
  typia.assert(resolvedDispute);
  TestValidator.equals(
    "resolution note updated",
    resolvedDispute.resolution_note,
    resolutionNoteBody.resolution_note,
  );

  // 7. Attempt an unauthorized update (wrong admin id) - verification logic: should NOT allow unauthorized update.
  // Simulate with a random UUID as an unassigned admin, assuming business logic prohibits update for unauthorized actor
  await TestValidator.error(
    "unauthorized admin update should fail",
    async () => {
      await api.functional.shoppingMall.admin.disputes.update(connection, {
        disputeId: currentDisputeId,
        body: {
          shopping_mall_admin_id: typia.random<string & tags.Format<"uuid">>(),
          subject: "Malicious update attempt", // attempt unauthorized change
        } satisfies IShoppingMallDispute.IUpdate,
      });
    },
  );
}
