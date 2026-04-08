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
 * Test that an administrator receives HTTP 404 when attempting to view a seller profile for a seller whose registration was rejected.
 *
 * Validates the platform's access control for rejected seller profiles. When an administrator rejects a seller registration, the seller record transitions to 'rejected' status. The admin seller profile endpoint should return HTTP 404 for rejected sellers, ensuring they cannot be accessed through the admin interface.
 *
 * This test ensures:
 * 1. Admin can successfully register and authenticate
 * 2. Seller can successfully register with pending status
 * 3. Admin can reject the seller registration with a reason
 * 4. Admin attempting to view rejected seller's profile returns HTTP 404
 *
 * Business Rule: Rejected sellers are not viewable through the admin interface to maintain platform integrity and prevent access to denied applications.
 */
export async function test_api_seller_profile_view_by_admin_rejected_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a seller (starts with pending status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Admin rejects the seller registration
  await api.functional.ecommerceMall.admin.admin.sellers.reject(
    adminConnection,
    {
      sellerId: seller.id,
      body: {
        rejectionReason: "Test rejection: does not meet seller requirements",
      } satisfies IEcommerceMallSeller.IUpdate,
    },
  );
  // 4. Admin attempts to view rejected seller's profile - should return 404
  await TestValidator.httpError(
    "rejected seller profile returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.sellers.at(adminConnection, {
        sellerId: seller.id,
      }),
  );
}
