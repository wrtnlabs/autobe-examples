import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_request_approval_from_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a customer account who will submit the admin request
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Submit admin request from customer (actorType='customer')
  // This creates a pending admin request in the system
  const adminRequestConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminRequestConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/admin-request",
      referrer: "https://example.com/home",
    },
  });
  // 4. Approve the pending admin request as super admin
  // Generate a random UUID for the requestId (in simulation mode, this works)
  // In production, you would first list pending requests to get the actual requestId
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.requests.approve(
      superAdminConnection,
      {
        requestId: requestId,
      },
    );
  // 5. Validate the response with typia.assert()
  typia.assert(approvedRequest);
  // Validate business logic:
  // - Request status should be 'approved'
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  // - Reviewer information should be included
  TestValidator.predicate("reviewer exists", approvedRequest.reviewer !== null);
  // - Reviewer should be the super admin who approved
  TestValidator.equals(
    "reviewer id matches approver",
    approvedRequest.reviewer!.id,
    superAdmin.id,
  );
  // - Actor type should be 'customer'
  TestValidator.equals(
    "actor type is customer",
    approvedRequest.actorType,
    "customer",
  );
  // - Requested grade should be 'admin'
  TestValidator.equals(
    "requested grade is admin",
    approvedRequest.requestedGrade,
    "admin",
  );
  // - Reviewed reason should be null (only set when rejecting)
  TestValidator.equals(
    "reviewed reason is null",
    approvedRequest.reviewedReason,
    null,
  );
  // - Deleted at should be null (not deleted)
  TestValidator.equals("deleted at is null", approvedRequest.deletedAt, null);
}
