import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_admin_request_snapshot_list_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create test customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Login as customer to get customer connection
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(customerAuth);
  // 4. Submit first admin request as customer
  const firstAdminRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerLoginConnection,
      {
        body: {
          reason: "Need admin access for testing purposes",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(firstAdminRequest);
  // 5. Login as super admin for approval
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 6. Approve the first admin request (creates approved snapshot)
  const approvedRequest =
    await api.functional.ecommerceMall.admin.admin_request_requests.approve(
      adminLoginConnection,
      {
        adminRequestId: firstAdminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // 7. Submit second admin request as customer
  const secondAdminRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerLoginConnection,
      {
        body: {
          reason: "Second request for testing rejection flow",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(secondAdminRequest);
  // 8. Reject the second admin request (creates rejected snapshot)
  const rejectedResponse =
    await api.functional.ecommerceMall.admin.admin_request_requests.reject(
      adminLoginConnection,
      {
        adminRequestId: secondAdminRequest.id,
        body: {
          rejectionReason: "Request does not meet approval criteria",
        } satisfies IEcommerceMallAdminRequestRequest.IRejectRequest,
      },
    );
  typia.assert(rejectedResponse);
  // 9. Login as super admin again for snapshot retrieval
  const adminSnapshotConnection: api.IConnection = { host: connection.host };
  const adminSnapshotAuth = await authorize_admin_login(
    adminSnapshotConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(adminSnapshotAuth);
  // 10. Call PATCH /ecommerceMall/admin/admin-request-snapshots to retrieve all snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
      adminSnapshotConnection,
      {
        body: {} satisfies IEcommerceMallAdminRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 11. Validate response structure
  typia.assert(snapshotsResponse);
  // 12. Verify each snapshot includes required fields
  for (const snapshot of snapshotsResponse.data) {
    typia.assert(snapshot);
    TestValidator.equals("snapshot has id", snapshot.id !== undefined, true);
    TestValidator.equals(
      "snapshot has reason",
      snapshot.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has requestStatus",
      snapshot.requestStatus !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has createdAt",
      snapshot.createdAt !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has changedAt",
      snapshot.changedAt !== undefined,
      true,
    );
    // changedByAdmin can be null or undefined, but if present must be valid
    if (
      snapshot.changedByAdmin !== undefined &&
      snapshot.changedByAdmin !== null
    ) {
      typia.assert(snapshot.changedByAdmin);
      TestValidator.equals(
        "changedByAdmin has id",
        snapshot.changedByAdmin.id !== undefined,
        true,
      );
    }
  }
  // 13. Validate pagination metadata
  const pagination = snapshotsResponse.pagination;
  typia.assert(pagination);
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals(
    "pageSize is within range",
    pagination.limit >= 1 && pagination.limit <= 100,
    true,
  );
  TestValidator.equals(
    "total records matches data length",
    pagination.records,
    snapshotsResponse.data.length,
  );
  TestValidator.equals(
    "total pages calculation",
    pagination.pages,
    Math.ceil(snapshotsResponse.data.length / pagination.limit),
  );
  // 14. Verify snapshots are sorted by changed_at DESC (newest first)
  if (snapshotsResponse.data.length > 1) {
    for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
      TestValidator.predicate(
        "snapshots sorted by changed_at DESC",
        new Date(snapshotsResponse.data[i].changedAt) >=
          new Date(snapshotsResponse.data[i + 1].changedAt),
      );
    }
  }
  // 15. Verify both approved and rejected snapshots exist
  const hasApproved = snapshotsResponse.data.some(
    (s) => s.requestStatus === "approved",
  );
  const hasRejected = snapshotsResponse.data.some(
    (s) => s.requestStatus === "rejected",
  );
  TestValidator.equals("has approved snapshot", hasApproved, true);
  TestValidator.equals("has rejected snapshot", hasRejected, true);
  // 16. Verify snapshot counts match
  TestValidator.equals("snapshots count", snapshotsResponse.data.length, 2);
}
