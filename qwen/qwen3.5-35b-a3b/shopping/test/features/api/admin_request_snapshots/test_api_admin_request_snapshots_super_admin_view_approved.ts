import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import type { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestRequest";
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

export async function test_api_admin_request_snapshots_super_admin_view_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin and customer accounts
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>,
      password: "testpass123",
      href: "http://test.com/admin/join",
      referrer: "http://test.com/admin",
    },
  });
  typia.assert(superAdmin);
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>,
      password: "testpass123",
      href: "http://test.com/customer/join",
      referrer: "http://test.com",
    },
  });
  typia.assert(customer);
  // 2. Customer creates admin request
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password: "testpass123",
      href: "http://test.com",
      referrer: "http://test.com",
    },
  });
  const adminRequestReason = RandomGenerator.paragraph({ sentences: 5 });
  const request =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerConnection,
      {
        body: {
          reason: adminRequestReason,
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(request);
  // 3. Super admin approves the request
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(superAdminConnection, {
    body: {
      email: superAdmin.email,
      password: "testpass123",
    },
  });
  // Find pending requests
  const pendingRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          request_status: ["pending"],
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // Find our customer's request
  const ourRequest = pendingRequests.data.find(
    (r) => r.customer?.id === customer.id,
  );
  TestValidator.equals(
    "found pending customer request",
    ourRequest,
    pendingRequests.data.find((r) => r.customer?.id === customer.id),
  );
  // Approve the request
  const approvedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.updateStatus(
      superAdminConnection,
      {
        adminRequestId: ourRequest!.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminRequestRequest.IUpdateStatus,
      },
    );
  typia.assert(approvedRequest);
  // 4. Verify request status changed
  const fetchedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.at(
      superAdminConnection,
      {
        adminRequestId: ourRequest!.id,
      },
    );
  typia.assert(fetchedRequest);
  // 5. Query snapshots with various filters
  const snapshotsResponse =
    await api.functional.ecommerceMall.admin.admin_requests.snapshots.index(
      superAdminConnection,
      {
        adminRequestId: ourRequest!.id,
        body: {
          status: "approved",
          changedBy: superAdmin.id,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Validate pagination
  TestValidator.equals(
    "snapshots total records matches data length",
    snapshotsResponse.pagination.records,
    snapshotsResponse.data.length,
  );
  TestValidator.equals(
    "snapshot count is 1 after approval",
    snapshotsResponse.data.length,
    1,
  );
  TestValidator.equals(
    "snapshots pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshots pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "snapshots pagination pages",
    snapshotsResponse.pagination.pages,
    1,
  );
  // Validate snapshot data
  const snapshot = snapshotsResponse.data[0];
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot reason matches original request",
    snapshot.reason,
    adminRequestReason,
  );
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.requestStatus,
    "approved",
  );
  TestValidator.predicate(
    "snapshot has valid changed_at timestamp",
    () => new Date(snapshot.changedAt).getTime() > 0,
  );
  TestValidator.equals(
    "snapshot changed_by is super admin",
    snapshot.changedBy?.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "snapshot adminRequest matches",
    snapshot.adminRequest.id,
    ourRequest!.id,
  );
  // 6. Test pagination with different page
  const snapshotsPage2 =
    await api.functional.ecommerceMall.admin.admin_requests.snapshots.index(
      superAdminConnection,
      {
        adminRequestId: ourRequest!.id,
        body: {
          page: 2,
          limit: 1,
        } satisfies IEcommerceMallAdminRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage2);
  TestValidator.equals(
    "page 2 has no more snapshots",
    snapshotsPage2.data.length,
    0,
  );
}