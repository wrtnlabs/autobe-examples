import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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
import { generate_random_ecommerce_mall_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_success_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const admin = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: adminCredentials,
    },
  );
  typia.assert(admin);
  // Create authenticated admin connection
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedAdminConnection.headers = { Authorization: admin.token.access };
  // Step 2: Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: sellerCredentials,
    },
  );
  typia.assert(seller);
  // Step 3: Retrieve pending seller approvals
  const approvalsPage =
    await api.functional.ecommerceMall.admin.seller_approvals.index(
      authenticatedAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(approvalsPage);
  // Find the approval record for our seller
  const approvalRecord = approvalsPage.data.find(
    (a) => a.seller.email === seller.email,
  );
  TestValidator.equals(
    "pending approval exists",
    approvalRecord !== undefined,
    true,
  );
  // Step 4: Approve the seller
  const approvedApproval =
    await api.functional.ecommerceMall.admin.seller_approvals.update(
      authenticatedAdminConnection,
      {
        approvalId: approvalRecord!.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedApproval);
  // Verify approval status is now approved
  TestValidator.equals("approval status", approvedApproval.status, "approved");
  // Step 5: Suspend the approved seller
  const suspensionReason = RandomGenerator.paragraph({ sentences: 2 });
  const suspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.create(
      authenticatedAdminConnection,
      {
        body: {
          seller_id: seller.id,
          reason: suspensionReason,
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // Validation: Suspension record should be created with seller_id matching the approved seller
  TestValidator.equals("seller_id matches", suspension.seller.id, seller.id);
  // Validation: suspended_at timestamp should be set to current time
  TestValidator.predicate(
    "suspended_at is set",
    suspension.suspended_at !== null && suspension.suspended_at !== undefined,
  );
  // Validation: restored_at should be NULL indicating active suspension
  TestValidator.equals("restored_at is null", suspension.restored_at, null);
  // Validation: reason should match the provided suspension reason
  TestValidator.equals("reason matches", suspension.reason, suspensionReason);
  // Validation: suspended_by should reference the authenticated admin
  TestValidator.equals(
    "suspended_by admin id matches",
    suspension.suspended_by.id,
    admin.id,
  );
  // Validation: Response should include seller summary
  TestValidator.predicate(
    "seller summary exists",
    suspension.seller !== undefined,
  );
  TestValidator.equals(
    "seller email matches",
    suspension.seller.email,
    seller.email,
  );
  // Validation: Response should include suspended_by admin summary
  TestValidator.predicate(
    "suspended_by admin summary exists",
    suspension.suspended_by !== undefined,
  );
  TestValidator.equals(
    "suspended_by admin email matches",
    suspension.suspended_by.email,
    admin.email,
  );
}
