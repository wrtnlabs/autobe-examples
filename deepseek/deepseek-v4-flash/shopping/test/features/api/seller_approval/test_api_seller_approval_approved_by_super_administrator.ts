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

export async function test_api_seller_approval_approved_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Promote administrator to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: adminAuth.id,
      } satisfies Partial<IECommerceMallSuperAdministrator.IJoin>,
    },
  );
  typia.assert(superAdminAuth);
  // Step 3: Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // The seller starts as 'pending' - need to verify
  TestValidator.equals(
    "initial approval status",
    sellerAuth.approval_status,
    "pending",
  );
  // Step 4: Seller creates an initial approval request (POST /seller/approval-requests)
  // This creates a new pending request record
  const initialRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(initialRequest);
  TestValidator.equals(
    "initial request status",
    initialRequest.status,
    "pending",
  );
  // Step 5: Super administrator rejects the initial approval request
  // Using the administrator endpoint (super admins retain admin powers)
  const rejectedRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      superAdminConnection,
      {
        requestId: initialRequest.id,
        body: {
          status: "rejected" as const,
          rejection_reason: "Initial documents incomplete",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals("rejected status", rejectedRequest.status, "rejected");
  TestValidator.equals(
    "rejection reason",
    rejectedRequest.rejection_reason,
    "Initial documents incomplete",
  );
  TestValidator.predicate(
    "reviewer assigned",
    rejectedRequest.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewed at set",
    rejectedRequest.reviewed_at !== null,
  );
  // Step 6: Seller submits a new approval request after rejection
  const newRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(newRequest);
  TestValidator.equals("new request is pending", newRequest.status, "pending");
  TestValidator.equals(
    "new request has different id",
    newRequest.id !== initialRequest.id,
    true,
  );
  TestValidator.predicate(
    "new request has no reviewer",
    newRequest.reviewer === null,
  );
  TestValidator.predicate(
    "new request not reviewed",
    newRequest.reviewed_at === null,
  );
  TestValidator.predicate(
    "new request rejection reason null",
    newRequest.rejection_reason === null,
  );
  // Step 7: Super administrator approves the new request
  const approvedRequest =
    await api.functional.eCommerceMall.superAdministrator.approval_requests.update(
      superAdminConnection,
      {
        requestId: newRequest.id,
        body: {
          status: "approved" as const,
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("approved status", approvedRequest.status, "approved");
  TestValidator.predicate(
    "approval rejection_reason null",
    approvedRequest.rejection_reason === null,
  );
  TestValidator.predicate(
    "approval reviewer assigned",
    approvedRequest.reviewer !== null,
  );
  TestValidator.predicate(
    "approval reviewed at set",
    approvedRequest.reviewed_at !== null,
  );
  // Step 8: Verify seller's approval_status changed to 'approved'
  // Re-authenticate as seller to get fresh status
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const refreshedSellerAuth = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerAuth.email,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSeller.ILogin,
    },
  );
  typia.assert(refreshedSellerAuth);
  TestValidator.equals(
    "seller approval_status after approval",
    refreshedSellerAuth.approval_status,
    "approved",
  );
}
