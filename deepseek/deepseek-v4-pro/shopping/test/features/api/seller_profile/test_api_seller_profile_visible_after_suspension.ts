import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Validate business rule from Section 479: suspended seller profiles remain
 * visible to administrators — only the seller's products are hidden from
 * search and category listings, not the profile itself.
 *
 * The test exercises the full lifecycle: seller registration, administrator
 * approval, suspension, and profile retrieval to prove that suspension does
 * not affect profile endpoint accessibility. The nested seller summary's
 * suspended boolean flag confirms the suspension was applied while the
 * profile data remains fully retrievable.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. Seller registers via join, creating a profile in pending approval state.
 * 3. Administrator approves the seller to reach approved status.
 * 4. Administrator suspends the approved seller.
 * 5. Administrator retrieves the seller's profile by profile ID.
 * 6. Validates the profile is returned with the seller's suspended flag set
 *    to true, confirming the suspension was applied while the profile
 *    remains fully visible.
 */
export async function test_api_seller_profile_visible_after_suspension(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register and authenticate seller (profile created automatically)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Administrator approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Administrator suspends the approved seller
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(suspendedSeller);
  // 5. Administrator retrieves the seller's profile after suspension
  const profile = await api.functional.shoppingMall.admin.profiles.at(
    adminConnection,
    { profileId: seller.profile.id },
  );
  typia.assert(profile);
  // 6. Validate profile is accessible and suspension is reflected
  TestValidator.equals("profile id matches", profile.id, seller.profile.id);
  TestValidator.predicate(
    "seller suspended flag is true after suspension",
    profile.seller.suspended,
  );
}
