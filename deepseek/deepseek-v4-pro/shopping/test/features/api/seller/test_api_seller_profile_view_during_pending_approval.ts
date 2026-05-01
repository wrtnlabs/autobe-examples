import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller can view their own profile during pending approval status.
 *
 * Validates the business rule that the shopping mall allows sellers to view their own profile at any time, including during the pending approval period before an administrator reviews the registration. Confirms that profile data is returned successfully even though selling capabilities remain gated behind administrator approval.
 *
 * 1. A new seller registers on the platform, starting in "pending" approval status.
 * 2. The seller retrieves their own profile via the profile endpoint.
 * 3. Validates the response contains valid profile data and the seller's approval status is "pending".
 */
export async function test_api_seller_profile_view_during_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller (starts in pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  TestValidator.equals(
    "approval status is pending",
    seller.approval_status,
    "pending",
  );
  // 2. Seller retrieves their own profile while pending
  const profile =
    await api.functional.shoppingMall.seller.profile.at(sellerConnection);
  typia.assert(profile);
}
