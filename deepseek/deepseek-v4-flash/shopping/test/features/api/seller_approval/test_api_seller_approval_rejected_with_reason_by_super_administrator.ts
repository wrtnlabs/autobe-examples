import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_approval_rejected_with_reason_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Setup: administrator
  //----
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234!@#$",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  //----
  // Setup: super administrator (promote the admin)
  //----
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: "test1234!@#$",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  //----
  // Setup: seller (approval_status = 'pending')
  //----
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = "test1234!@#$";
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  TestValidator.equals(
    "seller initial status",
    seller.approval_status,
    "pending",
  );
  //----
  // Seller submits an approval request
  //----
  const approvalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "approval request status",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "approval request reviewer",
    approvalRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "approval request rejection_reason",
    approvalRequest.rejection_reason,
    null,
  );
  //----
  // Login as super administrator to have the correct connection
  //----
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  const superAdminLogin = await authorize_super_administrator_login(
    superAdminLoginConnection,
    {
      body: {
        email: superAdmin.email,
        password: "test1234!@#$",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(superAdminLogin);
  //----
  // Super administrator rejects the approval request
  //----
  const rejectionReason =
    "Your business registration details do not match our records. Please verify your information and resubmit.";
  const rejectedRequest =
    await api.functional.eCommerceMall.superAdministrator.approval_requests.update(
      superAdminLoginConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  //----
  // Verify the rejection response
  //----
  TestValidator.equals("rejected status", rejectedRequest.status, "rejected");
  TestValidator.equals(
    "rejection reason matches",
    rejectedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewer id exists",
    rejectedRequest.reviewer !== null,
  );
  if (rejectedRequest.reviewer !== null) {
    TestValidator.equals(
      "reviewer id is super admin",
      rejectedRequest.reviewer.id,
      superAdmin.administrator.id,
    );
  }
  TestValidator.predicate(
    "reviewed_at is set",
    rejectedRequest.reviewed_at !== null,
  );
  //----
  // Verify seller's approval_status remains 'rejected'
  //----
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  TestValidator.equals(
    "seller approval status",
    sellerLogin.approval_status,
    "rejected",
  );
}
