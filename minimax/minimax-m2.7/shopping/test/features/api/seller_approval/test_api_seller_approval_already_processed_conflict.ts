import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";

/**
 * Test that attempting to update an already processed approval record returns a conflict error.
 *
 * Steps:
 * 1. Authenticate as an admin using POST /ecommerceMall/auth/admin/join
 * 2. Create a seller account by joining as seller via POST /ecommerceMall/auth/seller/join
 * 3. Create a seller approval record via POST /ecommerceMall/admin/seller-approvals with status 'approved'
 * 4. First PUT update to approve the seller (should succeed)
 * 5. Second PUT attempt to reject the same approval (should fail with conflict)
 *
 * Expected results:
 * - First PUT should succeed with status 200 OK
 * - Second PUT should return 409 Conflict error
 * - Error message should indicate the approval has already been processed
 * - The status from the first update should be preserved
 */
export async function test_api_seller_approval_already_processed_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a seller account (automatically creates pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  TestValidator.equals(
    "seller status is pending",
    seller.approval_status,
    "pending",
  );
  // 3. Create seller approval record with 'approved' status
  const approval =
    await generate_random_ecommerce_mall_admin_seller_approvals_create(
      adminConnection,
      {
        body: {
          sellerId: seller.id,
          status: "approved",
        },
      },
    );
  typia.assert(approval);
  TestValidator.equals(
    "approval status is approved",
    approval.status,
    "approved",
  );
  // 4. First PUT update to set status to 'approved' (should succeed)
  const firstUpdate =
    await api.functional.ecommerceMall.admin.seller_approvals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallSellerApproval.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  TestValidator.equals(
    "first update succeeded",
    firstUpdate.status,
    "approved",
  );
  // 5. Second PUT attempt to reject the already processed approval (should fail with 409 Conflict)
  await TestValidator.httpError(
    "already processed approval should return 409",
    409,
    async () => {
      await api.functional.ecommerceMall.admin.seller_approvals.update(
        adminConnection,
        {
          approvalId: approval.id,
          body: {
            status: "rejected",
            rejectionReason: "trying to reject already approved",
          } satisfies IEcommerceMallSellerApproval.IUpdate,
        },
      );
    },
  );
}
