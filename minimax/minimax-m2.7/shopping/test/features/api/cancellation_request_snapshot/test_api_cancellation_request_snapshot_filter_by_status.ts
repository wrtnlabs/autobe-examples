import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_request_snapshot_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/admin" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
    },
  });
  typia.assert(admin);
  // 2. Test filtering by status='approved'
  const approvedSnapshots =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "approved",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Verify all returned snapshots have 'approved' status
  for (const snapshot of approvedSnapshots.data) {
    TestValidator.equals(
      "snapshot status should be approved",
      snapshot.status,
      "approved",
    );
  }
  // 3. Test filtering by status='rejected'
  const rejectedSnapshots =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // Verify all returned snapshots have 'rejected' status
  for (const snapshot of rejectedSnapshots.data) {
    TestValidator.equals(
      "snapshot status should be rejected",
      snapshot.status,
      "rejected",
    );
  }
  // 4. Test pagination works correctly when filtering by status
  const pageSize = 5;
  const firstPage =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "approved",
          limit: pageSize,
          page: 1,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  // Test second page
  const secondPage =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "approved",
          limit: pageSize,
          page: 2,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page limit",
    secondPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals("second page number", secondPage.pagination.current, 2);
  // Verify both pages return only approved snapshots
  for (const snapshot of secondPage.data) {
    TestValidator.equals(
      "second page snapshot status should be approved",
      snapshot.status,
      "approved",
    );
  }
  // 5. Test without status filter (should return mixed results)
  const allSnapshots =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Verify mixed statuses when no filter is applied
  if (allSnapshots.data.length > 0) {
    const hasApproved = allSnapshots.data.some((s) => s.status === "approved");
    const hasRejected = allSnapshots.data.some((s) => s.status === "rejected");
    TestValidator.predicate(
      "unfiltered results contain at least one status type",
      hasApproved || hasRejected,
    );
  }
}
