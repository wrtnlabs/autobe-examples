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
 * Test that an authenticated seller can retrieve their own profile information.
 *
 * Validates the seller profile retrieval workflow by registering a new seller account and immediately fetching their own profile data. Ensures that the profile response contains all expected fields including authentication status, business information, and account state flags.
 *
 * Special attention is given to verifying that newly registered sellers have the correct default values for approval status, suspension, and ban flags, and that the soft-delete timestamp is null for active accounts.
 *
 * 1. Register and authenticate as a seller using the authorize_seller_join utility function
 * 2. Extract the seller's unique identifier from the authorization response
 * 3. Create a seller-specific connection for authenticated API calls
 * 4. Call GET /shoppingMall/sellers/{sellerId} with the seller's own ID
 * 5. Validate the response contains all required fields with correct types
 * 6. Verify the returned id matches the authenticated seller's ID
 * 7. Verify approval_status is 'pending' for newly registered seller
 * 8. Verify suspended and banned flags are false
 * 9. Verify deleted_at is null for active accounts
 * 10. Verify shop_name and shop_description are present from the seller profile
 */
export async function test_api_seller_profile_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
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
  // 2. Extract seller ID from authorization response
  const sellerId: string & tags.Format<"uuid"> = authorized.id;
  // 3. Retrieve seller's own profile
  const profile: IShoppingMallSeller =
    await api.functional.shoppingMall.sellers.at(sellerConnection, {
      sellerId,
    });
  typia.assert(profile);
  // 4. Validate profile data
  TestValidator.equals("seller id matches", profile.id, sellerId);
  TestValidator.equals(
    "approval status is pending",
    profile.approval_status,
    "pending",
  );
  TestValidator.equals("suspended is false", profile.suspended, false);
  TestValidator.equals("banned is false", profile.banned, false);
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
  TestValidator.predicate("shop_name is present", profile.shop_name.length > 0);
  TestValidator.predicate(
    "shop_description is present",
    profile.shop_description.length > 0,
  );
  TestValidator.predicate("email matches", profile.email === authorized.email);
}
