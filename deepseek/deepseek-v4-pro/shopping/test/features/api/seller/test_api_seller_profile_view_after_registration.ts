import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
 * Test that a newly registered seller can retrieve their own profile.
 *
 * Validates the complete flow of seller registration followed by profile retrieval. The test ensures that a seller who registers via the join endpoint can immediately access their own profile through the session-scoped endpoint, and that the profile response contains all expected fields with correct values.
 *
 * Special attention is given to verifying that security-sensitive data is never leaked — the password_hash must not appear in any profile response. Additionally, for a newly registered seller, both banned_at and deleted_at timestamps must be null, confirming the seller starts in good standing.
 *
 * 1. Seller registers through authorize_seller_join with random credentials.
 * 2. Seller retrieves their own profile via GET /shoppingMall/seller/profile.
 * 3. Validates profile id and email match the authorized seller's identity.
 * 4. Validates banned_at and deleted_at are null for new seller.
 * 5. Validates password_hash is not present in the response.
 */
export async function test_api_seller_profile_view_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // 2. Retrieve seller's own profile
  const profile =
    await api.functional.shoppingMall.seller.profile.at(sellerConnection);
  typia.assert(profile);
  // 3. Validate profile identity matches authorized seller
  TestValidator.equals(
    "profile id matches seller id",
    profile.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile email matches seller email",
    profile.email,
    authorized.email,
  );
  // 4. Validate new seller has no restrictions
  TestValidator.equals(
    "banned_at is null for new seller",
    profile.banned_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for new seller",
    profile.deleted_at,
    null,
  );
  // 5. Validate password_hash is not leaked in response
  TestValidator.predicate(
    "password_hash not in profile response",
    () => !("password_hash" in profile),
  );
}
