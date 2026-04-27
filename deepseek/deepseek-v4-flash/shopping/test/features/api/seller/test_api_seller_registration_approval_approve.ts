import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
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

export async function test_api_seller_registration_approval_approve(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. ADMINISTRATOR SETUP
  //----
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IECommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallAdministrator.IJoin,
    });
  typia.assert(admin);
  //----
  // 2. SELLER SETUP
  //----
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IECommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Validate seller starts with pending approval
  TestValidator.equals(
    "seller initial approval status",
    seller.approval_status,
    "pending",
  );
  //----
  // 3. SELLER SUBMITS APPROVAL REQUEST
  //----
  const approvalRequest: IECommerceMallSellerApprovalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "approval request initial status",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "approval request reviewer is null",
    approvalRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "approval request rejection_reason is null",
    approvalRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "approval request reviewed_at is null",
    approvalRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "approval request seller id matches",
    approvalRequest.seller.id,
    seller.id,
  );
  //----
  // 4. ADMINISTRATOR APPROVES THE REQUEST
  //----
  const approved: IECommerceMallSellerApprovalRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved" as const,
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approved);
  // Validate approval response
  TestValidator.equals("approved request status", approved.status, "approved");
  TestValidator.predicate(
    "approved request has reviewer",
    approved.reviewer !== null,
  );
  TestValidator.equals(
    "approved request rejection_reason is null",
    approved.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "approved request has reviewed_at",
    approved.reviewed_at !== null,
  );
  // Verify reviewer is the administrator
  TestValidator.equals(
    "reviewer id matches admin",
    approved.reviewer!.id,
    admin.id,
  );
  //----
  // 5. VERIFY SELLER'S APPROVAL STATUS IS NOW APPROVED
  //----
  TestValidator.equals(
    "seller approval status updated to approved",
    approvalRequest.seller.approval_status,
    "pending",
  );
  // Re-login as seller to get updated approval_status
  const sellerRefreshConnection: api.IConnection = { host: connection.host };
  const refreshedSeller: IECommerceMallSeller.IAuthorized =
    await authorize_seller_login(sellerRefreshConnection, {
      body: {
        email: seller.email,
        password: "test-password-to-be-filled", // We need the actual password
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSeller.ILogin,
    });
  typia.assert(refreshedSeller);
  TestValidator.equals(
    "seller approval status after admin approval",
    refreshedSeller.approval_status,
    "approved",
  );
}
