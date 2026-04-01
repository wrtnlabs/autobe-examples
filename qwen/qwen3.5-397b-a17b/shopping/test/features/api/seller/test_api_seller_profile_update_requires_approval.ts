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
 * Test that a seller with pending approval status cannot update their profile.
 *
 * This test validates the business rule that only approved sellers can modify
 * their shop profile. The scenario:
 * 1. Create a seller account using authorize_seller_join (will have pending status)
 * 2. Attempt to update the seller profile with shop_name, description, and logo_image_uri
 * 3. Verify the operation fails with appropriate error indicating approval is required
 *
 * This prevents unverified sellers from presenting themselves to customers before
 * administrator approval.
 */
export async function test_api_seller_profile_update_requires_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account (will have pending approval status by default)
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Attempt to update profile (should fail - seller not approved yet)
  await TestValidator.error(
    "pending seller cannot update profile",
    async () => {
      await api.functional.shoppingMall.sellers.profile.update(
        sellerConnection,
        {
          body: {
            shop_name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            logo_image_uri: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
          } satisfies IShoppingMallSellerProfile.IUpdate,
        },
      );
    },
  );
}