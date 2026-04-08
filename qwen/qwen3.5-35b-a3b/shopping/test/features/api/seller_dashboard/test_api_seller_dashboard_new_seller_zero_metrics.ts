import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import type { IEcommerceMallSellerDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboardMetric";
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

export async function test_api_seller_dashboard_new_seller_zero_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Test variables for storing credentials
  let sellerEmail: string & tags.Format<"email">;
  let sellerPassword: string;
  let sellerDisplayName: string;
  let approvalRequestId: string & tags.Format<"uuid">;
  // 1. Create seller account with pending approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinInput: IEcommerceMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    { body: joinInput },
  );
  typia.assert(seller);
  // Store seller credentials for later login
  sellerEmail = seller.email;
  sellerPassword = joinInput.password;
  sellerDisplayName = joinInput.display_name;
  approvalRequestId = seller.id;
  // Verify seller is created with pending approval status
  TestValidator.equals(
    "seller approval status pending",
    seller.approval_status,
    "pending",
  );
  TestValidator.equals("seller is suspended", seller.is_suspended, false);
  // 2. Create administrator for approval workflow
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput: IEcommerceMallAdministrator.IJoin = {
    display_name: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    grade: "regular",
  };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: adminJoinInput,
    });
  typia.assert(admin);
  // 3. Login as administrator for approval operations
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_login(adminLoginConnection, {
      body: {
        email: adminJoinInput.email,
        password: adminJoinInput.password,
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallAdministrator.ILogin,
    });
  typia.assert(adminLogin);
  // 4. Approve the seller registration as administrator
  // Note: Using seller.id as approvalRequestId as they are linked
  const approvalRequest: IEcommerceMallSellerApprovalRequest =
    await api.functional.ecommerceMall.administrator.seller_approvals.update(
      adminLoginConnection,
      {
        requestId: approvalRequestId,
        body: {
          status: "approved",
        } satisfies IEcommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalRequest);
  // Verify approval was successful
  TestValidator.equals(
    "approval status approved",
    approvalRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "approval has reviewer",
    approvalRequest.reviewer !== null,
  );
  // 5. Login as seller again after approval
  const sellerAfterApprovalConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerAfterApproval: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_login(sellerAfterApprovalConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(sellerAfterApproval);
  // Verify seller is now approved
  TestValidator.equals(
    "seller approval status approved",
    sellerAfterApproval.approval_status,
    "approved",
  );
  // 6. Access seller dashboard
  const dashboard: IEcommerceMallSellerDashboardMetric =
    await api.functional.ecommerceMall.seller.dashboard.at(
      sellerAfterApprovalConnection,
    );
  typia.assert(dashboard);
  // 7. Validate metrics are zero
  TestValidator.equals("product count is zero", dashboard.product_count, 0);
  TestValidator.equals(
    "order item count is zero",
    dashboard.order_item_count,
    0,
  );
  TestValidator.equals(
    "pending cancellation count is zero",
    dashboard.pending_cancellation_count,
    0,
  );
  TestValidator.equals(
    "pending refund count is zero",
    dashboard.pending_refund_count,
    0,
  );
  // 8. Validate seller identification
  TestValidator.equals("seller ID matches", dashboard.seller.id, seller.id);
  TestValidator.equals(
    "seller display name matches",
    dashboard.seller.display_name,
    sellerDisplayName,
  );
  TestValidator.equals(
    "seller approval status matches",
    dashboard.seller.approval_status,
    "approved",
  );
}