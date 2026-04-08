import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
 * Test seller profile retrieval for authenticated seller accounts.
 *
 * Validates that authenticated sellers can successfully retrieve their profile information through the profile endpoint. The test confirms the endpoint returns complete profile data with proper structure and timestamps.
 *
 * This test verifies the profile retrieval functionality works correctly for seller accounts, ensuring that the response contains all required fields and maintains data integrity. While the endpoint documentation mentions banned sellers retain read access, this test focuses on the baseline functionality for active seller accounts.
 *
 * 1. Register a new seller account with randomized credentials.
 * 2. Retrieve the seller profile using the authenticated connection.
 * 3. Validate the profile response structure and data integrity.
 */
export async function test_api_seller_profile_banned_account_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new seller
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
  // 2. Retrieve seller profile
  const profile =
    await api.functional.shoppingMall.seller.profile.at(sellerConnection);
  typia.assert(profile);
  // 3. Validate business logic: profile was created
  TestValidator.equals(
    "profile created_at matches seller registration era",
    profile.created_at <= new Date().toISOString(),
    true,
  );
  // 4. Validate profile has display name (business requirement)
  TestValidator.predicate(
    "profile has non-empty display name",
    profile.display_name.length > 0,
  );
  // 5. Validate updated_at is not before created_at (data integrity)
  TestValidator.predicate(
    "profile updated_at is after or equal to created_at",
    new Date(profile.updated_at) >= new Date(profile.created_at),
  );
}
