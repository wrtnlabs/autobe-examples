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

/**
 * Test that a super administrator can view a seller registration approval request in 'pending' status.
 *
 * Validates the full lifecycle of a seller approval request from initial creation through rejection and resubmission, culminating in the super administrator retrieving the new pending request.
 *
 * Special attention is given to verifying that the pending request has null values for reviewed fields (rejection_reason, reviewer, reviewed_at) and that the seller information correctly references the previously rejected seller account.
 *
 * 1. Administrator account is created and promoted to super administrator.
 * 2. Seller account is created with 'pending' approval status.
 * 3. The seller's initial approval request is retrieved and rejected by the administrator.
 * 4. The rejected seller submits a new registration approval request.
 * 5. The super administrator retrieves and validates the new pending request.
 */
export async function test_api_super_administrator_views_pending_approval_request(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  // 1. Create a regular administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Promote the regular administrator to super administrator
  const superAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const superAdminPassword: string = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
        email: superAdminEmail,
        password: superAdminPassword,
      },
    },
  );
  typia.assert(superAdmin);
  // 3. Create a seller account (approval_status = 'pending')
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(16);
  const sellerShopName: string = RandomGenerator.name();
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: sellerShopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  TestValidator.equals(
    "seller approval status is pending",
    seller.approval_status,
    "pending",
  );
  // 4. Retrieve the initial approval request and reject it
  // The seller join created an initial approval request with status 'pending'.
  // We call the create endpoint which returns the existing pending request.
  const initialRequest: IECommerceMallSellerApprovalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerJoinConnection,
    );
  typia.assert(initialRequest);
  TestValidator.equals(
    "initial request status is pending",
    initialRequest.status,
    "pending",
  );
  // Login as the regular administrator (who was promoted to super admin but retains admin privileges)
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Reject the initial approval request
  const rejectedRequest: IECommerceMallSellerApprovalRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminLoginConnection,
      {
        requestId: initialRequest.id,
        body: {
          status: "rejected" as const,
          rejection_reason:
            "Insufficient business documentation provided. Please include your business license and tax ID.",
        },
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "rejected request status",
    rejectedRequest.status,
    "rejected",
  );
  // 5. Login as the rejected seller and submit a new registration approval request
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const newRequest: IECommerceMallSellerApprovalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerLoginConnection,
    );
  typia.assert(newRequest);
  TestValidator.equals(
    "new request status is pending",
    newRequest.status,
    "pending",
  );
  // ---- Test ----
  // 6. Login as super administrator and retrieve the pending approval request
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminLoginConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const request: IECommerceMallSellerApprovalRequest =
    await api.functional.eCommerceMall.superAdministrator.approval_requests.at(
      superAdminLoginConnection,
      {
        requestId: newRequest.id,
      },
    );
  typia.assert(request);
  // 7. Validate
  TestValidator.equals("request id matches", request.id, newRequest.id);
  TestValidator.equals("status is pending", request.status, "pending");
  TestValidator.equals(
    "rejection_reason is null",
    request.rejection_reason,
    null,
  );
  TestValidator.equals("reviewer is null", request.reviewer, null);
  TestValidator.equals("reviewed_at is null", request.reviewed_at, null);
  // Validate seller field
  TestValidator.equals("seller id matches", request.seller.id, seller.id);
  TestValidator.equals(
    "seller email matches",
    request.seller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller approval_status is rejected",
    request.seller.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "seller shop name matches",
    request.seller.profile.shop_name,
    sellerShopName,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    () => !Number.isNaN(Date.parse(request.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    () => !Number.isNaN(Date.parse(request.updated_at)),
  );
  TestValidator.equals("deleted_at is null", request.deleted_at, null);
}
