import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import type { IEcommerceMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_administrator_seller_approval_snapshot_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular",
      },
    });
  typia.assert(admin);
  // 2. Administrator calls snapshot listing endpoint with default pagination
  const response: IPageIEcommerceMallSellerApprovalRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.administrator.seller_approval_request_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(response);
  // 3. Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Verify snapshots are sorted by snapshot_time DESC (newest first)
  if (response.data.length >= 2) {
    TestValidator.predicate(
      "snapshots are sorted by snapshot_time DESC",
      () => {
        for (let i = 0; i < response.data.length - 1; i++) {
          if (
            new Date(response.data[i].snapshotTime).getTime() <
            new Date(response.data[i + 1].snapshotTime).getTime()
          ) {
            return false;
          }
        }
        return true;
      },
    );
  }
  // 5. Verify each snapshot has required fields
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    // Verify snapshot structure
    TestValidator.predicate(
      "snapshot id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot status is valid",
      snapshot.status === "pending" ||
        snapshot.status === "approved" ||
        snapshot.status === "rejected",
    );
    TestValidator.predicate(
      "snapshotTime is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/.test(snapshot.snapshotTime),
    );
    // Verify approvalRequest reference
    typia.assert(snapshot.approvalRequest);
    TestValidator.equals(
      "approvalRequest has id",
      snapshot.approvalRequest.id.length > 0,
      true,
    );
    TestValidator.equals(
      "approvalRequest has seller reference",
      snapshot.approvalRequest.seller !== undefined,
      true,
    );
    TestValidator.equals(
      "approvalRequest has created_at",
      snapshot.approvalRequest.created_at.length > 0,
      true,
    );
    // Verify approvedByAdministrator based on status
    if (snapshot.status === "approved") {
      TestValidator.predicate(
        "approved snapshot has approvedByAdministrator",
        snapshot.approvedByAdministrator !== null,
      );
    } else {
      TestValidator.equals(
        "pending/rejected snapshots have null approvedByAdministrator",
        snapshot.approvedByAdministrator,
        null,
      );
    }
  }
}
