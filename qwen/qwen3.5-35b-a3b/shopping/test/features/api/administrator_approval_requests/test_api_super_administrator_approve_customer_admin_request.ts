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

export async function test_api_super_administrator_approve_customer_admin_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminJoin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        display_name: RandomGenerator.name(2),
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      },
    },
  );
  typia.assert(superAdminJoin);
  // 2. Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerJoin);
  // 3. Customer submits administrator approval request
  const approvalRequest =
    await api.functional.ecommerceMall.member.administrator_approval_requests.create(
      customerConnection,
      {
        body: {
          requestingMemberId: customerJoin.id,
          reason: typia.random<string & tags.MaxLength<1000>>(),
        } satisfies IEcommerceMallAdministratorApprovalRequests.ICreate,
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "request status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "requesting member set",
    approvalRequest.requestingMember?.id,
    customerJoin.id,
  );
  // 4. Super administrator approves the request
  const superAdminLogin = await authorize_super_administrator_login(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
      } satisfies IEcommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(superAdminLogin);
  const approvedRequest =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_requests.update(
      superAdminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved" as const,
        } satisfies IEcommerceMallAdministratorApprovalRequests.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate response
  TestValidator.equals(
    "status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "reviewing super admin set",
    approvedRequest.reviewingSuperAdmin !== null,
    true,
  );
  TestValidator.notEquals(
    "created admin is not null",
    approvedRequest.createdAdmin,
    null,
  );
  TestValidator.equals(
    "created admin matches customer email",
    approvedRequest.createdAdmin?.email,
    customerEmail,
  );
  TestValidator.equals(
    "created admin grade is regular",
    approvedRequest.createdAdmin?.grade,
    "regular",
  );
}
