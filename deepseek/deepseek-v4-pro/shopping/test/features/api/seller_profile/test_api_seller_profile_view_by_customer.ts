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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer can view a seller's public profile.
 *
 * Validates the seller profile retrieval endpoint accessible to authenticated
 * customers. Verifies that a customer who has joined the platform can retrieve
 * a seller's public storefront profile by its unique identifier and that the
 * response contains all expected fields including the nested seller summary
 * with approval status, suspension flags, and profile information.
 *
 * 1. A new customer registers and authenticates on the platform via
 *    authorize_customer_join, which creates the account and attaches the
 *    access token to the dedicated customer connection.
 * 2. The customer requests a seller profile by a randomly generated profile
 *    UUID through the customer profiles endpoint.
 * 3. The response is fully validated by typia.assert against the
 *    IShoppingMallSellerProfile type, confirming the presence of id,
 *    shop_name, shop_description, logo_image_uri, the nested seller summary
 *    (including email, approval_status, suspended and banned flags,
 *    created_at, and profile summary), and created_at/updated_at timestamps.
 * 4. Business logic checks verify that the returned profile ID matches the
 *    requested ID and that the created_at timestamp does not exceed the
 *    updated_at timestamp.
 */
export async function test_api_seller_profile_view_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_customer_join(customerConnection, {});
  typia.assert(auth);
  // 2. Retrieve seller profile by ID
  const profileId = typia.random<string & tags.Format<"uuid">>();
  const profile = await api.functional.shoppingMall.customer.profiles.at(
    customerConnection,
    { profileId },
  );
  typia.assert(profile);
  // 3. Validate profile identity and temporal consistency
  TestValidator.equals("profile id matches request", profile.id, profileId);
  TestValidator.predicate(
    "created_at is not after updated_at",
    new Date(profile.created_at) <= new Date(profile.updated_at),
  );
}
