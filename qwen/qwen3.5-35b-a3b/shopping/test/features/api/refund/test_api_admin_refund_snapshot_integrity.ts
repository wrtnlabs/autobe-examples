import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_refund_snapshot_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Retrieve snapshots list to get a valid snapshot ID
  // Since API doesn't expose order creation, we use pre-existing data
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotList =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(snapshotList);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    snapshotList.pagination.records >= 0,
    true,
  );
  // 3. Get a snapshot ID from the list
  // If no snapshots exist, we'll use a random UUID to test the endpoint response structure
  const snapshotIds = snapshotList.data.map((s) => s.id);
  const testSnapshotId: string =
    snapshotIds.length > 0
      ? RandomGenerator.pick(snapshotIds)
      : typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the specific snapshot
  const snapshot =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId,
        snapshotId: testSnapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Validate actor identification
  TestValidator.equals("actor type is seller", snapshot.actorType, "seller");
  // 6. Validate action type is one of the expected values
  const validActionTypes: IEcommerceMallRefundRequestSnapshot["actionType"][] =
    [
      "created",
      "status_changed",
      "reason_updated",
      "approved",
      "rejected",
      "response_added",
    ];
  TestValidator.predicate(
    "action type is valid",
    validActionTypes.includes(snapshot.actionType),
  );
  // 7. Validate timestamps
  // createdAt must be a valid date-time string
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(snapshot.createdAt)),
  );
  // 8. Validate deletedAt is null (immutable audit record)
  TestValidator.equals("deleted_at is null", snapshot.deletedAt, null);
  // 9. Validate refund request reference exists (UUID format)
  TestValidator.predicate(
    "refund request id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.refundRequestId,
    ),
  );
  // 10. Retrieve the same snapshot again to verify consistency
  const snapshotAgain =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId,
        snapshotId: testSnapshotId,
      },
    );
  typia.assert(snapshotAgain);
  // 11. Validate data consistency across retrievals
  TestValidator.equals("snapshot data is consistent", snapshot, snapshotAgain);
}
