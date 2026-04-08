import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
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
import { generate_random_ecommerce_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_approval_requests_create";
import { prepare_random_ecommerce_mall_seller_approval_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval_request";

/**
 * Test the complete approval workflow where an administrator reviews a pending seller approval request and approves it.
 *
 * Validates the seller approval request process from initial submission through administrator approval. Ensures that the seller account is properly activated after approval and all audit trail mechanisms (snapshots, reviewer assignment) function correctly.
 *
 * Special attention is given to verifying that the seller's approval status changes from 'pending' to 'approved', that the administrator who approved is properly recorded, and that the seller can subsequently use the platform to sell products.
 *
 * 1. Administrator joins and logs in with unique credentials.
 * 2. Seller joins the platform and authenticates (starts with pending approval status).
 * 3. Seller submits approval request with business reason for wanting to join the platform.
 * 4. Administrator approves the seller's request using the update endpoint.
 * 5. Validates that the approval request status changes to 'approved' with proper reviewer assignment.
 * 6. Verifies that the seller account approval_status is updated to 'approved' and seller can access the platform.
 */
export async function test_api_seller_approval_request_administrator_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name(2);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: adminDisplayName,
      email: adminEmail,
      password: adminPassword,
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResult);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_administrator_login(
    adminLoginConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallAdministrator.ILogin,
    },
  );
  typia.assert(adminLoginResult);
  // 2. Seller setup
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerDisplayName = RandomGenerator.name(2);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      display_name: sellerDisplayName,
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerResult);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginResult);
  // 3. Seller submits approval request with business reason
  const requestReason = RandomGenerator.paragraph({ sentences: 3 });
  const approvalRequest =
    await api.functional.ecommerceMall.seller.seller_approval_requests.create(
      sellerLoginConnection,
      {
        body: {
          request_reason: requestReason,
        } satisfies IEcommerceMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // Validate initial state: pending status, no reviewer
  TestValidator.equals(
    "initial status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial reviewer is null",
    approvalRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "initial rejection reason is null",
    approvalRequest.rejectionReason,
    null,
  );
  TestValidator.notEquals("request has seller", approvalRequest.seller, null);
  // 4. Administrator approves the request
  const updatedRequest =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.update(
      adminLoginConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
          rejection_reason: undefined, // Should be null on approval
        } satisfies IEcommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate approval outcomes
  TestValidator.equals(
    "status changed to approved",
    updatedRequest.status,
    "approved",
  );
  TestValidator.notEquals("reviewer is set", updatedRequest.reviewer, null);
  TestValidator.equals(
    "reviewer is administrator",
    updatedRequest.reviewer?.id,
    adminResult.id,
  );
  TestValidator.equals(
    "reviewer display_name preserved",
    updatedRequest.reviewer?.displayName,
    adminDisplayName,
  );
  TestValidator.equals(
    "rejection_reason is null on approval",
    updatedRequest.rejectionReason,
    null,
  );
  // 6. Validate seller account is updated with approval_status
  const updatedSellerLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const updatedSeller = await authorize_seller_login(
    updatedSellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(updatedSeller);
  TestValidator.equals(
    "seller approval_status is approved",
    updatedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "seller display_name preserved",
    updatedSeller.display_name,
    sellerDisplayName,
  );
  TestValidator.equals(
    "seller email preserved",
    updatedSeller.email,
    sellerEmail,
  );
  TestValidator.notEquals(
    "seller still active (not deleted)",
    updatedSeller.deleted_at,
    null,
  );
}
