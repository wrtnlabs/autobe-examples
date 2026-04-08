import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequestSnapshot";
import type { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_approval_snapshot_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join super administrator and get tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Browse administrator approval request snapshots
  const snapshots =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_request_snapshots.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(snapshots);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculation",
    snapshots.pagination.pages,
    snapshots.pagination.records === 0
      ? 0
      : Math.ceil(snapshots.pagination.records / snapshots.pagination.limit),
  );
  // 4. Validate each snapshot record
  for (const snapshot of snapshots.data) {
    typia.assert(snapshot);
    // Validate snapshot structure
    TestValidator.predicate(
      "snapshot id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
    );
    TestValidator.predicate(
      "snapshot requester_id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(snapshot.requester_id),
    );
    TestValidator.predicate(
      "snapshot requester_type is valid",
      snapshot.requester_type === "member" ||
        snapshot.requester_type === "seller",
    );
    TestValidator.predicate(
      "snapshot has request reason",
      snapshot.request_reason.length > 0,
    );
    TestValidator.predicate(
      "snapshot status is valid",
      snapshot.status === "pending" ||
        snapshot.status === "approved" ||
        snapshot.status === "rejected",
    );
    // Validate approved_grade based on status
    if (snapshot.status === "approved") {
      TestValidator.predicate(
        "approved snapshot has valid approved_grade",
        snapshot.approved_grade === "regular" ||
          snapshot.approved_grade === "super",
      );
    } else {
      TestValidator.equals(
        "non-approved snapshot has null approved_grade",
        snapshot.approved_grade,
        null,
      );
    }
    // Validate reviewer based on status
    if (snapshot.status === "pending") {
      TestValidator.equals(
        "pending snapshot has null reviewer",
        snapshot.reviewer,
        null,
      );
    }
    // Validate timestamps
    TestValidator.predicate(
      "snapshot created_at is valid date-time",
      !isNaN(Date.parse(snapshot.created_at)),
    );
    // Validate approval_request reference
    typia.assert(snapshot.approval_request);
    TestValidator.predicate(
      "approval_request id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(snapshot.approval_request.id),
    );
    TestValidator.predicate(
      "approval_request status is valid",
      snapshot.approval_request.status === "pending" ||
        snapshot.approval_request.status === "approved" ||
        snapshot.approval_request.status === "rejected",
    );
  }
}
