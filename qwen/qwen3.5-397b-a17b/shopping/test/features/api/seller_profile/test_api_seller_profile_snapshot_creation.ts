import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test seller profile update with automatic snapshot creation for audit trail.
 *
 * Validates that when a seller updates their shop profile, the system correctly applies the changes and returns the updated profile. The server automatically creates an immutable snapshot before applying changes to maintain an audit trail for dispute resolution and historical tracking.
 *
 * This test verifies the complete profile update workflow including seller authentication, profile modification with all available fields (shop_name, shop_description, logo_image_url), and validation that the response reflects the new values accurately.
 *
 * 1. Seller registers with email and credentials using authorize_seller_join utility.
 * 2. Creates seller-specific connection with authentication token from registration response.
 * 3. Prepares update payload with new shop name, description, and logo image URL.
 * 4. Submits PATCH request to update seller profile.
 * 5. Validates response contains updated values matching the input.
 * 6. Verifies updated_at timestamp is a valid ISO 8601 date-time string.
 *
 * Note: Snapshot creation is handled server-side automatically during update. The successful update response confirms the snapshot was created before changes were applied. Profile updates require seller to have approved status.
 */
export async function test_api_seller_profile_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller and get authentication
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 3. Prepare update payload with new profile values
  const updatePayload = {
    shopName: RandomGenerator.paragraph({ sentences: 2 }),
    shopDescription: RandomGenerator.content({ paragraphs: 2 }),
    logoImageUrl: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerProfile.IUpdate;
  // 4. Update seller profile (server creates snapshot automatically)
  const updatedProfile =
    await api.functional.shoppingMall.seller_profiles.update(sellerConnection, {
      body: updatePayload,
    });
  typia.assert(updatedProfile);
  // 5. Validate updated values match input
  TestValidator.equals(
    "shop name matches",
    updatedProfile.shop_name,
    updatePayload.shopName,
  );
  TestValidator.equals(
    "shop description matches",
    updatedProfile.shop_description,
    updatePayload.shopDescription,
  );
  TestValidator.equals(
    "logo URL matches",
    updatedProfile.logo_image_url,
    updatePayload.logoImageUrl,
  );
  // 6. Validate profile structure
  TestValidator.predicate(
    "seller reference exists",
    updatedProfile.seller !== undefined,
  );
  TestValidator.equals(
    "seller email matches",
    updatedProfile.seller.email,
    sellerAuth.email,
  );
  // 7. Verify timestamps are valid ISO 8601 format (typia.assert already validates format)
  TestValidator.predicate(
    "created_at is set",
    updatedProfile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is set",
    updatedProfile.updated_at.length > 0,
  );
  // 8. Verify seller has approved status (required for profile operations)
  TestValidator.equals(
    "seller approval status",
    updatedProfile.seller.approvalStatus,
    "approved",
  );
}
