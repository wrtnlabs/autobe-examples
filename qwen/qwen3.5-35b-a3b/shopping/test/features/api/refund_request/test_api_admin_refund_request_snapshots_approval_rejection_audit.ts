import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator can retrieve snapshots specifically showing seller approval or rejection decisions for refund requests.
 * The admin joins the platform, then retrieves snapshots filtered by action_type='approved' or action_type='rejected' to verify the seller's decision audit trail.
 */
export async function test_api_admin_refund_request_snapshots_approval_rejection_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create a refund request ID for testing
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Admin retrieves approved snapshots for the refund request
  const approvedSnapshots =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          action_type: "approved",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // 4. Admin retrieves rejected snapshots for the refund request
  const rejectedSnapshots =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          action_type: "rejected",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // 5. Validate pagination structure
  TestValidator.equals(
    "approved snapshots pagination current",
    approvedSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "rejected snapshots pagination current",
    rejectedSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "approved snapshots limit valid",
    approvedSnapshots.pagination.limit >= 1 &&
      approvedSnapshots.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "rejected snapshots limit valid",
    rejectedSnapshots.pagination.limit >= 1 &&
      rejectedSnapshots.pagination.limit <= 100,
  );
  TestValidator.equals(
    "approved snapshots records",
    approvedSnapshots.pagination.records,
    approvedSnapshots.data.length,
  );
  TestValidator.equals(
    "rejected snapshots records",
    rejectedSnapshots.pagination.records,
    rejectedSnapshots.data.length,
  );
  // 6. Validate snapshot data structure (if any snapshots exist)
  if (approvedSnapshots.data.length > 0) {
    const firstApprovedSnapshot = approvedSnapshots.data[0];
    typia.assert(firstApprovedSnapshot);
    // Verify actor type is seller for approval snapshots
    TestValidator.equals(
      "approved snapshot actor type",
      firstApprovedSnapshot.actorType,
      "seller",
    );
    // Verify action type is approved
    TestValidator.equals(
      "approved snapshot action type",
      firstApprovedSnapshot.actionType,
      "approved",
    );
    // Verify status transition (from pending to approved)
    TestValidator.equals(
      "approved snapshot status before",
      firstApprovedSnapshot.statusBefore,
      "pending",
    );
    TestValidator.equals(
      "approved snapshot status after",
      firstApprovedSnapshot.statusAfter,
      "approved",
    );
    // Verify timestamp exists
    TestValidator.predicate(
      "approved snapshot has timestamp",
      firstApprovedSnapshot.createdAt !== undefined,
    );
  }
  if (rejectedSnapshots.data.length > 0) {
    const firstRejectedSnapshot = rejectedSnapshots.data[0];
    typia.assert(firstRejectedSnapshot);
    // Verify actor type is seller for rejection snapshots
    TestValidator.equals(
      "rejected snapshot actor type",
      firstRejectedSnapshot.actorType,
      "seller",
    );
    // Verify action type is rejected
    TestValidator.equals(
      "rejected snapshot action type",
      firstRejectedSnapshot.actionType,
      "rejected",
    );
    // Verify status transition (from pending to rejected)
    TestValidator.equals(
      "rejected snapshot status before",
      firstRejectedSnapshot.statusBefore,
      "pending",
    );
    TestValidator.equals(
      "rejected snapshot status after",
      firstRejectedSnapshot.statusAfter,
      "rejected",
    );
    // Verify timestamp exists
    TestValidator.predicate(
      "rejected snapshot has timestamp",
      firstRejectedSnapshot.createdAt !== undefined,
    );
  }
}
