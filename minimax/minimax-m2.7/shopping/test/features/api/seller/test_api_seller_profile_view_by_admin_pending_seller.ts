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
 * Test that an administrator receives HTTP 404 when attempting to view a seller profile for a seller whose registration is still in 'pending' status.
 *
 * This test validates the platform's access control for seller profile visibility. Only sellers with 'approved' status should be viewable by administrators. Sellers with 'pending' status (awaiting administrator approval) must not be accessible through the admin seller profile endpoint.
 *
 * The test flow:
 * 1. Create an administrator account for platform management operations.
 * 2. Create a seller account with 'pending' approval status (no administrator approval given).
 * 3. Administrator attempts to retrieve the pending seller's profile via GET /ecommerceMall/admin/sellers/{sellerId}.
 * 4. Validate that the endpoint returns HTTP 404, ensuring pending sellers remain inaccessible until approved.
 *
 * This behavior protects platform integrity by preventing premature access to seller profiles before administrator verification.
 */
export async function test_api_seller_profile_view_by_admin_pending_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create seller account with pending status (no approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Verify seller is in pending status
  TestValidator.equals(
    "seller has pending status",
    seller.approvalStatus,
    "pending",
  );
  // 3. Admin attempts to view the pending seller's profile
  // Should return HTTP 404 as pending sellers are not accessible
  await TestValidator.httpError(
    "admin cannot view pending seller profile",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.sellers.at(adminConnection, {
        sellerId: seller.id,
      }),
  );
}
