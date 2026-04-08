import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that any user (including unauthenticated) can retrieve a valid seller's complete profile information.
 *
 * Validates the public access endpoint for seller profiles, ensuring that the complete seller information including authentication status, business profile details, and account state is accessible without authentication. This is essential for customers browsing products and viewing seller information on product listings.
 *
 * Special attention is given to verifying that newly registered sellers have the correct default values: approval_status is 'pending', suspended and banned are false, deleted_at is null, and logo_uri is null.
 *
 * 1. Register a new seller account using authorize_seller_join utility function.
 * 2. Extract the seller's ID from the join response.
 * 3. Create a new unauthenticated connection for public access.
 * 4. Call GET /shoppingMall/sellers/{sellerId} with the seller's ID.
 * 5. Verify the response contains all expected fields with typia.assert.
 * 6. Validate default values for newly registered seller.
 */
export async function test_api_seller_profile_retrieve_public(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Extract the seller's ID
  const sellerId: string = seller.id;
  // 3. Create a new unauthenticated connection for public access
  const publicConnection: api.IConnection = { host: connection.host };
  // 4. Call GET /shoppingMall/sellers/{sellerId}
  const profile = await api.functional.shoppingMall.sellers.at(
    publicConnection,
    {
      sellerId,
    },
  );
  typia.assert(profile);
  // 5. Verify all expected fields exist (already validated by typia.assert)
  // 6. Validate default values for newly registered seller
  TestValidator.equals(
    "approval_status is pending",
    profile.approval_status,
    "pending",
  );
  TestValidator.equals("suspended is false", profile.suspended, false);
  TestValidator.equals("banned is false", profile.banned, false);
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
  TestValidator.equals("logo_uri is null", profile.logo_uri, null);
  TestValidator.predicate("shop_name is present", profile.shop_name.length > 0);
  TestValidator.predicate(
    "shop_description is present",
    profile.shop_description.length > 0,
  );
  TestValidator.equals(
    "email matches registration",
    profile.email,
    seller.email,
  );
  TestValidator.equals("id matches registration", profile.id, seller.id);
}
