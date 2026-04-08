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
 * Test the edge case where a newly registered seller has not yet created their shop profile.
 *
 * Validates the business rule that sellers may not have a profile immediately after registration.
 * When a new seller who has not yet created their shop profile attempts to retrieve their own
 * profile, the system should gracefully handle this by returning a 404 Not Found response with
 * an appropriate error message. This ensures proper error handling for the edge case where
 * sellers register but have not set up their shop profile yet.
 *
 * 1. Register a new seller account via POST /ecommerceMall/auth/seller/join
 *    - The join endpoint creates a seller record with pending approval status
 *    - Returns authorization tokens for authenticated requests
 * 2. Attempt to retrieve the seller's own profile via GET /ecommerceMall/seller/sellers/me/profile
 *    - Since the seller has not created a shop profile, the endpoint should return 404
 * 3. Validate the 404 Not Found error response
 *    - Confirms the system properly handles missing profiles
 */
export async function test_api_seller_profile_not_found_for_new_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Attempt to retrieve the seller's own profile
  // 3. Validate the response returns 404 Not Found
  await TestValidator.httpError(
    "new seller profile not found (404)",
    404,
    async () =>
      await api.functional.ecommerceMall.seller.sellers.me.profile.at(
        sellerConnection,
      ),
  );
}
