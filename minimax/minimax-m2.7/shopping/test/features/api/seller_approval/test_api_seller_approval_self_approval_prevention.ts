import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_approval_self_approval_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account with pending approval status
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await api.functional.ecommerceMall.auth.seller.join(
    sellerJoinConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuthorized);
  TestValidator.equals(
    "seller approval status is pending",
    sellerAuthorized.approvalStatus,
    "pending",
  );
  // 2. Create a super admin to approve the admin request
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminJoinConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // Login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminLoginResult =
    await api.functional.ecommerceMall.auth.superAdmin.login(
      superAdminConnection,
      {
        body: {
          email: superAdminEmail,
          password: superAdminPassword,
        } satisfies IEcommerceMallSuperAdmin.ILogin,
      },
    );
  typia.assert(superAdminLoginResult);
  // 3. The seller requests admin privileges using the same email
  const sellerAdminRequestConnection: api.IConnection = {
    host: connection.host,
  };
  const adminRequestResult =
    await api.functional.ecommerceMall.auth.admin.request.join(
      sellerAdminRequestConnection,
      {
        body: {
          actorType: "seller",
          requestedGrade: "admin",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallAdmin.IJoin,
      },
    );
  typia.assert(adminRequestResult);
  // Note: The admin request join creates an admin account immediately (for audit, the request has 'pending' status)
  // The tokens are returned so the person can immediately act as admin
  // 4. Login as admin using the seller's credentials (admin is linked to seller account)
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await api.functional.ecommerceMall.auth.admin.login(
    adminLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(adminLoginResult);
  // 5. List pending seller approvals to find the admin's own seller approval
  const approvalsListConnection: api.IConnection = { host: connection.host };
  const approvalsListResult =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      approvalsListConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalsListResult);
  const ownApproval = approvalsListResult.data.find(
    (approval) => approval.seller.email === sellerEmail,
  );
  TestValidator.equals(
    "own seller approval exists in pending list",
    ownApproval !== undefined,
    true,
  );
  // 6. Attempt to approve own seller approval - should fail with self-approval error
  await TestValidator.error("self-approval should be prevented", async () => {
    const approveConnection: api.IConnection = { host: connection.host };
    await api.functional.ecommerceMall.admin.admin.seller_approvals.approve(
      approveConnection,
      {
        approvalId: ownApproval!.id,
      },
    );
  });
  // 7. Verify the approval status is still 'pending' (not changed)
  const approvalsListAfterConnection: api.IConnection = {
    host: connection.host,
  };
  const approvalsListAfterResult =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      approvalsListAfterConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalsListAfterResult);
  const ownApprovalAfter = approvalsListAfterResult.data.find(
    (approval) => approval.seller.email === sellerEmail,
  );
  TestValidator.equals(
    "approval status still pending after self-approval attempt",
    ownApprovalAfter?.status,
    "pending",
  );
}
