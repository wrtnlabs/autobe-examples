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
 * Test that administrators cannot approve sellers who are already approved or rejected.
 *
 * Validates the business rule that only sellers with pending approval status can be approved by administrators. This test verifies that attempting to approve an already-approved seller returns an error and that the seller's approval status remains unchanged.
 *
 * 1. Register a seller via POST /auth/seller/join (creates seller with pending status).
 * 2. Authenticate as admin via POST /auth/admin/join.
 * 3. First, approve the seller successfully via POST /admin/admin/sellers/{sellerId}/approve.
 * 4. Validate the seller's approval_status changes to 'approved'.
 * 5. Attempt to approve the same seller again.
 * 6. Validate the second approval attempt returns an error.
 * 7. Verify seller.approval_status is still 'approved' (unchanged).
 *
 * This test ensures data integrity by preventing duplicate approval actions on non-pending sellers.
 */
export async function test_api_seller_approval_already_approved_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller with pending status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  // Store the seller ID for later use
  const sellerId = sellerAuth.id;
  // 2. Create an admin for approval operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  typia.assert(adminConnection);
  // 3. First approval - should succeed and change status to 'approved'
  const firstApproval =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId },
    );
  typia.assert(firstApproval);
  // Validate the first approval was successful
  TestValidator.equals(
    "approval status after first approval",
    firstApproval.approvalStatus,
    "approved",
  );
  // 4. Attempt to approve the same seller again - should fail
  await TestValidator.error(
    "cannot approve already approved seller",
    async () => {
      await api.functional.ecommerceMall.admin.admin.sellers.approve(
        adminConnection,
        { sellerId },
      );
    },
  );
  // 5. Verify seller status remains 'approved' by checking via login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult =
    await api.functional.ecommerceMall.auth.seller.login(
      sellerLoginConnection,
      {
        body: {
          email: sellerAuth.email,
          password: sellerPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallSeller.ILogin,
      },
    );
  typia.assert(sellerLoginResult);
  // Verify the seller is approved and can login (approved sellers can authenticate)
  TestValidator.equals(
    "seller still approved after duplicate approval attempt",
    sellerLoginResult.approvalStatus,
    "approved",
  );
}
