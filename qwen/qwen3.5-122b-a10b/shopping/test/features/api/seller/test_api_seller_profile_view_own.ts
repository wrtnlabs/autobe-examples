import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
 * Test seller profile view operation for own profile.
 *
 * Validates that a seller can successfully retrieve their own shop profile including all profile fields and embedded seller summary information. This test ensures the profile retrieval endpoint works correctly for the profile owner with proper authorization.
 *
 * The test follows the complete workflow of seller registration, profile creation, and profile retrieval. It verifies that the profile contains all expected fields and that the embedded seller summary matches the authenticated seller's account information.
 *
 * 1. Create seller-specific connection for authentication.
 * 2. Register new seller account using authorize_seller_join utility.
 * 3. Extract profile ID from the authorized response.
 * 4. Call profile retrieval endpoint with the seller's profile ID.
 * 5. Validate response structure and field completeness.
 * 6. Verify profile data matches registered seller information.
 */
export async function test_api_seller_profile_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(authorized);
  // 2. Verify profile exists in authorized response
  TestValidator.predicate("profile exists", authorized.profile !== null);
  const profileId = authorized.profile!.id;
  // 3. Retrieve seller's own profile
  const profile = await api.functional.ecommerce.seller.profiles.at(
    sellerConnection,
    { profileId },
  );
  typia.assert(profile);
  // 4. Validate profile structure and data
  TestValidator.equals("profile ID matches", profile.id, profileId);
  TestValidator.predicate("shop name exists", profile.shop_name.length > 0);
  TestValidator.predicate(
    "created_at is valid date-time",
    profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    profile.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null for active profile",
    profile.deleted_at === null,
  );
  // 5. Validate optional profile fields (can be null)
  TestValidator.predicate(
    "shop_description is valid (nullable)",
    profile.shop_description === null || profile.shop_description.length >= 0,
  );
  TestValidator.predicate(
    "logo_image_url is valid (nullable URI)",
    profile.logo_image_url === null || profile.logo_image_url.length > 0,
  );
  // 6. Validate embedded seller summary
  TestValidator.equals("seller ID matches", profile.seller.id, authorized.id);
  TestValidator.equals(
    "seller shop name matches",
    profile.seller.shop_name,
    profile.shop_name,
  );
  TestValidator.predicate(
    "seller approval status exists",
    profile.seller.approval_status.length > 0,
  );
}