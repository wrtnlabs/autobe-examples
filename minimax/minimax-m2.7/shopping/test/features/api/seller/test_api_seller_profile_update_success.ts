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
 * Test that a seller can successfully update their shop profile with new name and description.
 *
 * Validates the seller profile update flow including registration, authentication, and profile modification. Verifies that:
 * - Seller can register and authenticate successfully
 * - Profile update endpoint accepts new name and description
 * - Response contains updated values and nested seller summary
 * - Timestamp is properly updated
 *
 * 1. Register a new seller account via /auth/seller/join using utility function
 * 2. Create seller-specific connection with authentication token
 * 3. Update profile with new shop name and description via PATCH endpoint
 * 4. Validate response contains updated profile data
 * 5. Validate nested seller summary information
 * 6. Validate updated_at timestamp is recent
 */
export async function test_api_seller_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const authorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(connection, {});
  // 2. Create seller-specific connection with token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Generate new profile data
  const newShopName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 2,
    wordMax: 5,
  });
  const newDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  // 4. Update seller profile
  const updatedProfile =
    await api.functional.ecommerceMall.seller.sellers.me.profile.patch(
      sellerConnection,
      {
        body: {
          name: newShopName,
          description: newDescription,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Validate profile was updated correctly
  TestValidator.equals("shop name updated", updatedProfile.name, newShopName);
  TestValidator.equals(
    "description updated",
    updatedProfile.description,
    newDescription,
  );
  // 6. Validate updated_at is recent (within current minute)
  const now = new Date();
  const updatedAt = new Date(updatedProfile.updated_at);
  const timeDiff = Math.abs(now.getTime() - updatedAt.getTime());
  TestValidator.predicate("updated_at is recent", timeDiff < 60 * 1000);
  // 7. Validate nested seller summary
  TestValidator.equals(
    "seller email matches",
    updatedProfile.seller.email,
    authorized.email,
  );
  TestValidator.predicate("seller has id", updatedProfile.seller.id.length > 0);
}