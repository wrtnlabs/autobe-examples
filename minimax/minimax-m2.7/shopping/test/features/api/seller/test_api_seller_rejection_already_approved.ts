import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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

/**
 * Test rejection of an already-approved seller by administrator.
 *
 * Validates the business rule that only sellers with 'pending' approval status
 * can be rejected. This test ensures that attempting to reject a seller who
 * has already been approved returns an error response, protecting the integrity
 * of the seller approval workflow.
 *
 * 1. Administrator registers on the platform.
 * 2. Seller registers with pending approval status.
 * 3. Administrator approves the seller.
 * 4. Administrator attempts to reject the already-approved seller.
 * 5. Validates that rejection fails with 400 error indicating seller is not pending.
 */
export async function test_api_seller_rejection_already_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registers with pending status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Administrator approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: seller.id },
    );
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller is approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 4. Administrator attempts to reject the already-approved seller
  // This should fail with 400 Bad Request
  await TestValidator.httpError(
    "cannot reject approved seller",
    400,
    async () => {
      await api.functional.ecommerceMall.admin.admin.sellers.reject(
        adminConnection,
        {
          sellerId: approvedSeller.id,
          body: {
            rejectionReason: "Test rejection reason",
          } satisfies IEcommerceMallSeller.IUpdate,
        },
      );
    },
  );
}
