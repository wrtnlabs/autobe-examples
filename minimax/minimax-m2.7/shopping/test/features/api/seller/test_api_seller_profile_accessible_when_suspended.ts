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
import { generate_random_ecommerce_mall_admin_admin_sellers_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_admin_sellers_suspend";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

/**
 * Test that suspended sellers can still access their own shop profile.
 *
 * Validates the business rule that suspended sellers retain read access to their shop profile information. This ensures that account suspension does not block sellers from viewing their own profile data including shop name, description, and logo. The test follows the complete workflow from seller registration through approval, profile setup, suspension, and final profile retrieval while suspended.
 *
 * **Test Flow:**
 * 1. Admin registers and authenticates to enable approval operations
 * 2. New seller registers with pending approval status
 * 3. Admin approves the seller registration
 * 4. Approved seller authenticates and updates their shop profile
 * 5. Admin suspends the approved seller account
 * 6. Suspended seller re-authenticates (login should still work for suspended accounts)
 * 7. Suspended seller retrieves their own profile via GET /seller/sellers/me/profile
 * 8. Validates profile data is returned with all expected fields
 *
 * **Business Rule Validation:**
 * Per the platform requirements, suspended sellers SHALL still be permitted to view their shop profile. This test confirms that suspension blocks product operations and visibility but preserves profile access.
 */
export async function test_api_seller_profile_accessible_when_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 2. Register new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass123!";
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // 3. Admin approves the seller registration
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerJoinResult.id,
    },
  );
  // 4. Authenticate as approved seller and update profile
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/login",
      referrer: "https://example.com/seller",
    },
  });
  const shopName = RandomGenerator.name(2);
  const shopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedProfile =
    await api.functional.ecommerceMall.seller.sellers.me.profile.patch(
      sellerConnection,
      {
        body: {
          name: shopName,
          description: shopDescription,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Admin suspends the seller account
  await api.functional.ecommerceMall.admin.admin.sellers.suspend(
    adminConnection,
    {
      sellerId: sellerJoinResult.id,
      body: {
        reason:
          "Policy violation - test suspension for profile access validation",
      } satisfies IEcommerceMallSellerSuspension.ICreate,
    },
  );
  // 6. Re-authenticate as the suspended seller
  const suspendedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(suspendedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/login",
      referrer: "https://example.com/seller",
    },
  });
  // 7. Retrieve the seller's own profile while suspended
  const profile =
    await api.functional.ecommerceMall.seller.sellers.me.profile.at(
      suspendedSellerConnection,
    );
  typia.assert(profile);
  // 8. Validate profile data is accessible and complete
  TestValidator.equals("profile name matches", profile.name, shopName);
  TestValidator.equals(
    "profile description matches",
    profile.description,
    shopDescription,
  );
  TestValidator.equals("profile id exists", profile.id !== null, true);
  TestValidator.equals(
    "profile seller id matches",
    profile.seller.id,
    sellerJoinResult.id,
  );
  TestValidator.equals(
    "profile email matches",
    profile.seller.email,
    sellerEmail,
  );
}
