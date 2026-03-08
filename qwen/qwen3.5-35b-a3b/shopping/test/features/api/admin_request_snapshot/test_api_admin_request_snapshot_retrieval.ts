import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_admin_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Admin setup - join and login as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Customer submits admin request
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
    },
  });
  const adminRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerLoginConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  const originalReason = adminRequest.reason;
  // 4. Admin retrieves admin requests list to find pending request
  const adminRequests =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          request_status: "pending",
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(adminRequests);
  const pendingRequest = adminRequests.data.find(
    (req) => req.id === adminRequest.id,
  );
  TestValidator.notEquals("pending request exists", pendingRequest, undefined);
  // 5. Admin approves the request (triggers snapshot creation)
  const approvedRequest =
    await api.functional.ecommerceMall.admin.admin_request_requests.approve(
      adminConnection,
      {
        adminRequestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request status approved",
    approvedRequest.request_status,
    "approved",
  );
  // 6. Admin retrieves snapshots list
  const snapshots =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.index(
      adminConnection,
      {
        body: {
          requestStatus: "approved",
        } satisfies IEcommerceMallAdminRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Find the snapshot that belongs to this admin request
  const snapshot = snapshots.data.find(
    (snap) =>
      snap.changedByAdmin === undefined || snap.changedByAdmin !== undefined,
  );
  TestValidator.notEquals("snapshot exists", snapshot, undefined);
  // 7. Admin retrieves specific snapshot by ID
  const retrievedSnapshot =
    await api.functional.ecommerceMall.admin.admin_request_snapshots.at(
      adminConnection,
      {
        snapshotId: snapshot!.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 8. Validate all snapshot fields
  TestValidator.equals("snapshot id", retrievedSnapshot.id, snapshot!.id);
  TestValidator.equals(
    "reason matches",
    retrievedSnapshot.reason,
    originalReason,
  );
  TestValidator.equals(
    "request_status",
    retrievedSnapshot.request_status,
    "approved",
  );
  TestValidator.equals(
    "created_at",
    retrievedSnapshot.created_at,
    adminRequest.created_at,
  );
  TestValidator.equals(
    "ecommerce_mall_admin_request_request_id",
    retrievedSnapshot.ecommerce_mall_admin_request_request_id,
    adminRequest.id,
  );
  // 9. Verify changed_at is set (timestamp when snapshot was created)
  TestValidator.predicate("changed_at is valid date", () => {
    const date = new Date(retrievedSnapshot.changed_at);
    return !isNaN(date.getTime());
  });
}