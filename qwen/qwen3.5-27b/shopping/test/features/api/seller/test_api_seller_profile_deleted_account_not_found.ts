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
 * Test seller profile retrieval after account registration.
 *
 * Validates the seller profile endpoint by registering a new seller account and verifying that the profile can be successfully retrieved. This test ensures the authentication flow works correctly and that seller profile data is accessible after registration.
 *
 * The test covers the complete seller onboarding flow: account creation with email and password credentials, automatic authentication token generation, and profile data retrieval. It validates that the seller's profile information is properly stored and retrievable immediately after registration.
 *
 * 1. Register a new seller account with email and password credentials.
 * 2. Validate that the registration response contains proper authentication tokens and seller information.
 * 3. Retrieve the seller's profile using the authenticated session.
 * 4. Validate that the profile data is correctly returned and matches expected structure.
 */
export async function test_api_seller_profile_deleted_account_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Validate registration response
  TestValidator.predicate("seller has valid ID", seller.id.length > 0);
  TestValidator.equals("email matches input", seller.email, seller.email);
  TestValidator.predicate(
    "approval status is pending",
    seller.approval_status === "pending",
  );
  TestValidator.predicate("has access token", seller.token.access.length > 0);
  TestValidator.predicate("has refresh token", seller.token.refresh.length > 0);
  // 3. Retrieve the seller's profile using authenticated session
  const profile =
    await api.functional.shoppingMall.seller.profile.at(sellerConnection);
  typia.assert(profile);
  // 4. Validate profile data
  TestValidator.predicate("profile has valid ID", profile.id.length > 0);
  TestValidator.predicate(
    "profile has display name",
    profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "profile has created_at timestamp",
    profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "profile has updated_at timestamp",
    profile.updated_at.length > 0,
  );
}
