import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_approval_request_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  // 2. Generate a valid approval request ID for snapshot retrieval
  const approvalRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve snapshots for the approval request
  const response: IPageIEcommerceMallSellerApprovalSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.index(
      adminConnection,
      {
        approvalRequestId,
        body: typia.random<IEcommerceMallSellerApprovalSnapshot.IRequest>(),
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata exists and has valid structure
  TestValidator.predicate(
    "pagination has current page",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    response.pagination.pages >= 0,
  );
  // 5. Validate snapshot data structure if snapshots exist
  if (response.data.length > 0) {
    // Test first snapshot has all required fields
    const snapshot: IEcommerceMallSellerApprovalSnapshot.ISummary =
      response.data[0];
    typia.assert(snapshot);
    // Validate snapshot ID is a valid UUID
    TestValidator.predicate("snapshot has valid ID", snapshot.id !== undefined);
    // Validate status values are from valid enum (pending, approved, rejected)
    TestValidator.predicate(
      "from_status is valid",
      ["pending", "approved", "rejected"].includes(snapshot.from_status),
    );
    TestValidator.predicate(
      "to_status is valid",
      ["pending", "approved", "rejected"].includes(snapshot.to_status),
    );
    // Validate actor_type is from valid enum (admin, superAdmin)
    TestValidator.predicate(
      "actor_type is valid",
      ["admin", "superAdmin"].includes(snapshot.actor_type),
    );
    // Validate actor_id is either null or valid UUID
    TestValidator.predicate(
      "actor_id is either null or UUID",
      snapshot.actor_id === null ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.actor_id,
        ),
    );
    // Validate rejection_reason is either null or string
    TestValidator.predicate(
      "rejection_reason is either null or string",
      snapshot.rejection_reason === null ||
        typeof snapshot.rejection_reason === "string",
    );
    // Validate created_at is a valid date-time
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(Date.parse(snapshot.created_at)),
    );
    // Validate relationship IDs are valid UUIDs
    TestValidator.predicate(
      "approval_request_id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.ecommerce_mall_seller_approval_request_id,
      ),
    );
    TestValidator.predicate(
      "seller_id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.ecommerce_mall_seller_id,
      ),
    );
    // Validate that all snapshots in the response have required structure
    for (let i = 1; i < response.data.length; i++) {
      const nextSnapshot: IEcommerceMallSellerApprovalSnapshot.ISummary =
        response.data[i];
      typia.assert(nextSnapshot);
      TestValidator.predicate(
        `snapshot ${i} has valid status transition`,
        ["pending", "approved", "rejected"].includes(
          nextSnapshot.from_status,
        ) &&
          ["pending", "approved", "rejected"].includes(nextSnapshot.to_status),
      );
      TestValidator.predicate(
        `snapshot ${i} has valid actor_type`,
        ["admin", "superAdmin"].includes(nextSnapshot.actor_type),
      );
    }
  }
}
