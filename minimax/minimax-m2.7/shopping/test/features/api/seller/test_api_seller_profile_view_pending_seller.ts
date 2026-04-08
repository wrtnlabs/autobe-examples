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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that viewing a seller's public profile returns 404 when the seller
 * has not yet been approved by an administrator.
 *
 * Validates that the public seller profile endpoint properly enforces
 * access control based on seller approval status. Only sellers with
 * "approved" status should have accessible public profiles. Pending
 * sellers (awaiting administrator review) should not have their profiles
 * visible to the public.
 *
 * This test ensures:
 * 1. Seller registration creates an account with "pending" approval status
 * 2. The public profile endpoint returns 404 for unapproved sellers
 * 3. Business logic properly gates profile access based on approval state
 *
 * 1. Register a new seller account using authorize_seller_join utility.
 * 2. Extract the seller ID from the registration response.
 * 3. Call the public profile endpoint GET /ecommerceMall/sellers/{sellerId}/profile.
 * 4. Validate that a 404 HTTP error is returned.
 */
export async function test_api_seller_profile_view_pending_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (stays in pending status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // Validate seller was created with pending approval status
  TestValidator.equals(
    "approval status is pending",
    seller.approvalStatus,
    "pending",
  );
  // 2. Attempt to retrieve the pending seller's public profile
  // Note: The profile endpoint is public (no auth required) so we use base connection
  await TestValidator.httpError(
    "pending seller profile returns 404",
    404,
    async () =>
      api.functional.ecommerceMall.sellers.profile.at(connection, {
        sellerId: seller.id,
      }),
  );
}
