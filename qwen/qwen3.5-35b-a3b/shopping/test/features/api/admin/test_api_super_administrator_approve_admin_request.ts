import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_approve_admin_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerAuthorized);
  const customerId = customerAuthorized.id;
  typia.assert(customerId);
  // 2. Customer submits administrator approval request
  const customerRequestConnection: api.IConnection = { host: connection.host };
  const requestResponse =
    await api.functional.ecommerceMall.member.administrator_approval_requests.create(
      customerRequestConnection,
      {
        body: {
          requestingMemberId: customerId,
          reason:
            "I need administrative privileges to manage customer support operations",
        } satisfies IEcommerceMallAdministratorApprovalRequests.ICreate,
      },
    );
  typia.assert(requestResponse);
  const requestId = requestResponse.id;
  typia.assert(requestId);
  TestValidator.equals(
    "request status is pending",
    requestResponse.status,
    "pending",
  );
  // 3. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(superAdminAuthorized);
  const superAdminId = superAdminAuthorized.id;
  typia.assert(superAdminId);
  // 4. Super administrator approves the pending request
  const approvedRequest =
    await api.functional.ecommerceMall.superAdministrator.admin_requests.update(
      superAdminConnection,
      {
        requestId,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdministratorApprovalRequests.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  // Verify reviewing super administrator is set
  TestValidator.equals(
    "reviewing super admin ID matches",
    approvedRequest.reviewingSuperAdmin?.id,
    superAdminId,
  );
  // 5. Verify a new administrator account was created
  TestValidator.equals(
    "created admin is not null",
    approvedRequest.createdAdmin !== null,
    true,
  );
  if (approvedRequest.createdAdmin !== null) {
    TestValidator.equals(
      "created admin has grade admin",
      typia.assert<"admin">(approvedRequest.createdAdmin.grade),
      "admin",
    );
    // The created admin should have the customer's email
    TestValidator.equals(
      "created admin email matches customer",
      approvedRequest.createdAdmin.email,
      customerAuthorized.email,
    );
    // Verify admin was created with correct display name
    TestValidator.equals(
      "created admin display name matches customer",
      approvedRequest.createdAdmin.displayName,
      customerAuthorized.display_name ?? "Customer",
    );
  }
  // 6. Verify request cannot be updated again after approval
  await TestValidator.error("cannot update approved request", async () => {
    await api.functional.ecommerceMall.superAdministrator.admin_requests.update(
      superAdminConnection,
      {
        requestId,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdministratorApprovalRequests.IUpdate,
      },
    );
  });
}