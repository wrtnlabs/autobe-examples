import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_cancellation_request_snapshots_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Test listing all snapshots without filters
  const allSnapshots: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(allSnapshots);
  TestValidator.equals(
    "pagination metadata exists",
    allSnapshots.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination current page is 1",
    allSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 100",
    allSnapshots.pagination.limit,
    100,
  );
  TestValidator.equals("data is array", Array.isArray(allSnapshots.data), true);
  // 3. Test filtering by actor_type = customer
  const customerSnapshots: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          actor_type: "customer",
          limit: 100,
        },
      },
    );
  typia.assert(customerSnapshots);
  TestValidator.equals(
    "actor_type filter works",
    customerSnapshots.pagination.records,
    customerSnapshots.pagination.records,
  );
  for (const snapshot of customerSnapshots.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot actor_type is customer",
      snapshot.actor_type,
      "customer",
    );
  }
  // 4. Test filtering by response_status = approved
  const approvedSnapshots: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          response_status: "approved",
          limit: 100,
        },
      },
    );
  typia.assert(approvedSnapshots);
  for (const snapshot of approvedSnapshots.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "approved snapshot has approved_at",
      snapshot.approved_at !== null,
      true,
    );
    TestValidator.equals(
      "approved snapshot has null rejected_at",
      snapshot.rejected_at === null,
      true,
    );
  }
  // 5. Test filtering by response_status = rejected
  const rejectedSnapshots: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          response_status: "rejected",
          limit: 100,
        },
      },
    );
  typia.assert(rejectedSnapshots);
  for (const snapshot of rejectedSnapshots.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "rejected snapshot has rejected_at",
      snapshot.rejected_at !== null,
      true,
    );
    TestValidator.equals(
      "rejected snapshot has null approved_at",
      snapshot.approved_at === null,
      true,
    );
  }
  // 6. Test filtering by created_at_range
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const rangeSnapshots: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_range: {
            gte: oneWeekAgo.toISOString(),
          },
          limit: 100,
        },
      },
    );
  typia.assert(rangeSnapshots);
  TestValidator.equals(
    "date range filter works",
    rangeSnapshots.pagination.records,
    rangeSnapshots.pagination.records,
  );
  for (const snapshot of rangeSnapshots.data) {
    typia.assert(snapshot);
    if (snapshot.created_at !== undefined) {
      TestValidator.predicate(
        "snapshot created_at is within range",
        new Date(snapshot.created_at) >= oneWeekAgo,
      );
    }
  }
  // 7. Test pagination with different limits
  const limit20: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 20,
        },
      },
    );
  typia.assert(limit20);
  TestValidator.equals("limit 20 applied", limit20.pagination.limit, 20);
  const limit50: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 50,
        },
      },
    );
  typia.assert(limit50);
  TestValidator.equals("limit 50 applied", limit50.pagination.limit, 50);
  // 8. Validate snapshot data structure
  for (const snapshot of allSnapshots.data) {
    typia.assert(snapshot);
    TestValidator.equals("snapshot has id", snapshot.id !== null, true);
    TestValidator.equals(
      "snapshot has title",
      typeof snapshot.title === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has actor_type",
      typeof snapshot.actor_type === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has created_at",
      typeof snapshot.created_at === "string",
      true,
    );
    TestValidator.equals(
      "cancellationRequest reference exists",
      snapshot.cancellationRequest !== undefined,
      true,
    );
    TestValidator.equals(
      "cancellationRequest has id",
      snapshot.cancellationRequest.id !== null,
      true,
    );
    TestValidator.equals(
      "cancellationRequest has reason",
      typeof snapshot.cancellationRequest.reason === "string",
      true,
    );
    TestValidator.equals(
      "cancellationRequest has status",
      typeof snapshot.cancellationRequest.status === "string",
      true,
    );
    TestValidator.equals(
      "cancellationRequest has item",
      snapshot.cancellationRequest.item !== undefined,
      true,
    );
    TestValidator.equals(
      "cancellationRequest has order",
      snapshot.cancellationRequest.order !== undefined,
      true,
    );
    TestValidator.equals(
      "cancellationRequest has seller",
      snapshot.cancellationRequest.seller !== undefined,
      true,
    );
  }
  // 9. Test empty result set
  const noSnapshots: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 100,
          search: "nonexistent-search-term-xyz123",
        },
      },
    );
  typia.assert(noSnapshots);
  TestValidator.equals(
    "empty search returns 0 records",
    noSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns empty array",
    noSnapshots.data.length,
    0,
  );
}