import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

/**
 * Test scenario verifying that a suspended seller can still update their shop profile.
 *
 * Business Rule: Suspended sellers can edit their profile but cannot create new products
 * or edit existing products. This test validates that profile updates remain permitted
 * during suspension.
 *
 * Test Flow:
 * 1. Register and join a new seller account
 * 2. Create an admin account
 * 3. Admin suspends the seller
 * 4. Suspended seller logs in
 * 5. Seller attempts to update their shop profile (description)
 * 6. Validate profile update succeeds and creates a snapshot
 */
export async function test_api_seller_profile_update_by_suspended_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account with known password for later login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword as string & tags.Format<"password">,
    },
  });
  typia.assert(sellerAuth);
  // 2. Create admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 3. Admin suspends the seller
  const suspension =
    await generate_random_ecommerce_mall_admin_seller_suspensions_create(
      adminConnection,
      {
        body: {
          seller_id: sellerAuth.id,
          reason: "Policy violation - test suspension",
        },
      },
    );
  typia.assert(suspension);
  TestValidator.equals("suspension active", suspension.restored_at, null);
  TestValidator.equals(
    "suspended seller matches",
    suspension.seller.id,
    sellerAuth.id,
  );
  // 4. Suspended seller logs in with new connection
  const suspendedSellerConnection: api.IConnection = { host: connection.host };
  const suspendedSellerAuth = await authorize_seller_login(
    suspendedSellerConnection,
    {
      body: {
        email: sellerAuth.email,
        password: sellerPassword,
        href: "https://example.com/seller",
        referrer: "https://example.com",
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(suspendedSellerAuth);
  // 5. Seller updates their shop profile (should succeed despite suspension)
  const newDescription =
    "Updated shop description while suspended - profile edit should work";
  const updatedProfile =
    await api.functional.ecommerceMall.seller.seller.profile.update(
      suspendedSellerConnection,
      {
        body: {
          description: newDescription,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 6. Validate profile update succeeded
  TestValidator.equals(
    "profile description updated",
    updatedProfile.description,
    newDescription,
  );
  TestValidator.equals(
    "profile belongs to correct seller",
    updatedProfile.seller.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "profile has valid updated_at timestamp",
    updatedProfile.updated_at !== null && updatedProfile.updated_at.length > 0,
  );
}
