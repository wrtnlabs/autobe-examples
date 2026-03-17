import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_seller_approval_request_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const adminAuthorized = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(adminAuthorized);
  // 2. Create seller account - this creates a pending approval request
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 3. Get seller's approval request ID from seller summary
  // The seller's approval request ID should be accessible via the seller endpoint
  const sellerApprovalRequest =
    await api.functional.ecommerceMall.seller.approval_requests.at(
      sellerConnection,
      {
        approvalRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(sellerApprovalRequest);
  // 4. Admin approves the seller's request
  const updatedApprovalRequest =
    await api.functional.ecommerceMall.admin.approval_requests.update(
      adminConnection,
      {
        approvalRequestId: sellerApprovalRequest.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedApprovalRequest);
  // 5. Validate approved status in the approval request response
  TestValidator.equals(
    "approval request status is approved",
    updatedApprovalRequest.status,
    "approved",
  );
  TestValidator.equals(
    "approval request ID matches",
    updatedApprovalRequest.id,
    sellerApprovalRequest.id,
  );
  // 6. Seller retrieves their approval request to verify approved status
  const retrievedApprovalRequest =
    await api.functional.ecommerceMall.seller.approval_requests.at(
      sellerConnection,
      {
        approvalRequestId: sellerApprovalRequest.id,
      },
    );
  typia.assert(retrievedApprovalRequest);
  // 7. Validate approved status is reflected in both approval request and seller summary
  TestValidator.equals(
    "retrieved approval request status is approved",
    retrievedApprovalRequest.status,
    "approved",
  );
  TestValidator.equals(
    "seller ID matches authorized seller",
    retrievedApprovalRequest.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "seller email matches authorized seller",
    retrievedApprovalRequest.seller.email,
    sellerAuthorized.email,
  );
  TestValidator.equals(
    "seller status is approved",
    retrievedApprovalRequest.seller.status,
    "approved",
  );
  TestValidator.equals(
    "seller account has no deleted_at (active)",
    retrievedApprovalRequest.seller.deletedAt,
    null,
  );
}
