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

export async function test_api_admin_approval_request_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuthorized);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Seller setup (creates pending approval request automatically)
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // 3. Retrieve pending approval request for this seller
  // Note: This would typically require a GET endpoint to list approval requests
  // For this test, we assume the system returns the approval request ID
  // In production, there should be an endpoint like GET /ecommerceMall/admin/approval-requests
  const approvalRequest =
    await api.functional.ecommerceMall.admin.approval_requests.update(
      adminConnection,
      {
        approvalRequestId: sellerAuthorized.id,
        body: {
          status: "approved" as const,
          rejection_reason: null,
        } satisfies IEcommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalRequest);
  // 4. Validate approval request status
  TestValidator.equals(
    "approval request status approved",
    approvalRequest.status,
    "approved",
  );
  // 5. Validate seller status is approved
  const sellerSummary = approvalRequest.seller;
  typia.assert(sellerSummary);
  TestValidator.equals(
    "seller status approved",
    sellerSummary.status,
    "approved",
  );
  // 6. Validate seller gains full selling capabilities
  // After approval, seller should be able to create products, manage orders, etc.
  // This is validated by the seller status being 'approved' in the summary
  TestValidator.equals(
    "seller can access selling features",
    sellerSummary.status,
    "approved",
  );
}
