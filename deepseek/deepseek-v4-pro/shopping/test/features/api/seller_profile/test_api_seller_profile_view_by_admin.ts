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
 * Test that an administrator can retrieve a seller's public profile.
 *
 * Validates the admin profile viewing endpoint by registering an administrator and a seller, then having the admin retrieve the seller's storefront profile. Confirms that all expected profile fields — shop identity, seller summary, and timestamps — are correctly returned in the current live state without historical snapshot data.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. Seller registers via join, which auto-creates the seller profile.
 * 3. Admin retrieves the seller profile by its profile ID.
 * 4. Validates all profile fields match the expected values from registration.
 */
export async function test_api_seller_profile_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller account (profile auto-created)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin retrieves seller profile
  const profile = await api.functional.shoppingMall.admin.profiles.at(
    adminConnection,
    { profileId: seller.profile.id },
  );
  typia.assert(profile);
  // 4. Validate profile fields
  TestValidator.equals("profile id", profile.id, seller.profile.id);
  TestValidator.equals(
    "shop_name",
    profile.shop_name,
    seller.profile.shop_name,
  );
  TestValidator.equals(
    "shop_description",
    profile.shop_description,
    seller.profile.shop_description,
  );
  TestValidator.equals(
    "logo_image_uri",
    profile.logo_image_uri,
    seller.profile.logo_image_uri,
  );
  TestValidator.equals("seller email", profile.seller.email, seller.email);
  TestValidator.equals(
    "approval status",
    profile.seller.approval_status,
    "pending",
  );
  TestValidator.predicate("not suspended", profile.seller.suspended === false);
  TestValidator.predicate("not banned", profile.seller.banned === false);
  TestValidator.predicate(
    "profile created_at exists",
    profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "profile updated_at exists",
    profile.updated_at.length > 0,
  );
}
