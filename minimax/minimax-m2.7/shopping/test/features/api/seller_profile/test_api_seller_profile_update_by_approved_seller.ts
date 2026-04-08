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
 * Test that an approved seller can successfully update their shop profile with new shop name, description, and logo.
 *
 * Validates the complete profile update workflow for approved sellers including seller registration and profile modification. Verifies that the PUT request to /ecommerceMall/seller/sellers/me/profile correctly updates the shop name, business description, and logo URI fields. Ensures the updated_at timestamp is refreshed after modification. Tests the primary success path where sellers modify their public-facing shop information displayed on product listings and order records.
 *
 * The test flow follows the natural business process: first, a seller registers on the platform, then they update their shop profile information including the shop name, business description, and logo. After the update, the system should return the updated profile with a refreshed updated_at timestamp.
 *
 * 1. Seller registers with valid email and password using POST /ecommerceMall/auth/seller/join.
 * 2. Seller authenticates and receives authorization token.
 * 3. Seller updates profile with new name, description, and logo using PUT /ecommerceMall/seller/sellers/me/profile.
 * 4. Validates response contains updated values (name, description, logo_uri) and updated_at is refreshed.
 */
export async function test_api_seller_profile_update_by_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // Set authorization header for seller connection
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = seller.token.access;
  // Capture profile before update for timestamp comparison
  const profileBeforeUpdate = seller.profile;
  const updatedAtBefore = profileBeforeUpdate?.updatedAt
    ? new Date(profileBeforeUpdate.updatedAt)
    : new Date();
  // 2. Prepare updated profile data
  const newShopName = RandomGenerator.name(2);
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const newLogoUri = typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>();
  // 3. Update seller profile using PUT /ecommerceMall/seller/sellers/me/profile
  const updatedProfile =
    await api.functional.ecommerceMall.seller.sellers.me.profile.put(
      sellerConnection,
      {
        body: {
          name: newShopName,
          description: newDescription,
          logoUri: newLogoUri,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate response
  TestValidator.equals(
    "shop name is updated",
    updatedProfile.name,
    newShopName,
  );
  TestValidator.equals(
    "description is updated",
    updatedProfile.description,
    newDescription,
  );
  TestValidator.equals(
    "logo_uri is updated",
    updatedProfile.logo_uri,
    newLogoUri,
  );
  TestValidator.predicate(
    "updated_at timestamp is refreshed",
    new Date(updatedProfile.updated_at) > updatedAtBefore,
  );
}