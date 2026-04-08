import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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

export async function test_api_seller_approval_cannot_approve_already_processed_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account with pending status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 3. Retrieve the pending seller approval
  const approvalsPage =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(approvalsPage);
  // Find the approval for the seller we just created
  const pendingApproval = approvalsPage.data.find(
    (approval) => approval.seller.id === sellerAuth.id,
  );
  TestValidator.equals(
    "pending approval exists",
    pendingApproval !== undefined,
    true,
  );
  const approvalId = pendingApproval!.id;
  // 4. Approve the seller request (first time - should succeed)
  const firstApproval =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.approve(
      adminConnection,
      {
        approvalId: approvalId,
      },
    );
  typia.assert(firstApproval);
  TestValidator.equals("status is approved", firstApproval.status, "approved");
  // 5. Attempt to approve the same request again (should fail)
  await TestValidator.error(
    "cannot approve already approved request",
    async () => {
      await api.functional.ecommerceMall.admin.admin.seller_approvals.approve(
        adminConnection,
        {
          approvalId: approvalId,
        },
      );
    },
  );
}
