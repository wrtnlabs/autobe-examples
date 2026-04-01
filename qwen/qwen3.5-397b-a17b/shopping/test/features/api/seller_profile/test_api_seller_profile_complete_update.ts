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
 * Test complete seller profile update workflow.
 *
 * This test validates that an approved seller can successfully update their
 * complete shop profile including shop name, description, and logo image URI.
 *
 * Test Flow:
 * 1. Register a new seller account using authorize_seller_join utility
 * 2. Create seller-specific connection with authentication token
 * 3. Update seller profile with all three fields modified
 * 4. Validate response contains updated profile with correct structure
 * 5. Verify updated_at timestamp is present
 * 6. Verify seller approval status is accessible in response
 */
export async function test_api_seller_profile_complete_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account using utility function
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
  // 2. Create seller-specific connection with authentication token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 3. Prepare update data with all three fields
  const updateData = {
    shop_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    logo_image_uri: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
  } satisfies IShoppingMallSellerProfile.IUpdate;
  // 4. Update seller profile
  const updatedProfile =
    await api.functional.shoppingMall.sellers.profile.update(sellerConnection, {
      body: updateData,
    });
  typia.assert(updatedProfile);
  // 5. Validate updated profile contains all modified fields
  TestValidator.equals(
    "shop_name matches",
    updatedProfile.shop_name,
    updateData.shop_name,
  );
  TestValidator.equals(
    "description matches",
    updatedProfile.description,
    updateData.description,
  );
  TestValidator.equals(
    "logo_image_uri matches",
    updatedProfile.logo_image_uri,
    updateData.logo_image_uri,
  );
  // 6. Validate profile timestamps are present
  TestValidator.predicate(
    "updated_at is present",
    updatedProfile.updated_at !== null,
  );
  TestValidator.predicate(
    "created_at is present",
    updatedProfile.created_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null",
    updatedProfile.deleted_at === null,
  );
  // 7. Validate seller information in profile
  TestValidator.equals(
    "seller id matches",
    updatedProfile.seller.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "seller has approval_status",
    updatedProfile.seller.approval_status !== undefined,
  );
}