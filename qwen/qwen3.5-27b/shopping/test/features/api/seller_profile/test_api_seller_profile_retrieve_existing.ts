import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test retrieving an existing seller profile by its unique identifier.
 *
 * Validates that seller profiles are publicly accessible without authentication and contain all required fields with correct data types and formats. This test ensures the public seller profile endpoint returns complete and properly formatted data for product listings and order records.
 *
 * The test creates a new seller account to generate a valid profile, then retrieves the profile using the public endpoint. It verifies that all fields conform to the IShoppingMallSellerProfile schema, including UUID format for the id, non-empty strings for shop information, valid approval status, and proper datetime formats.
 *
 * 1. Register a new seller account with email and password credentials.
 * 2. Extract the seller profile ID from the authorization response.
 * 3. Retrieve the seller profile using the public GET endpoint without authentication.
 * 4. Validate all response fields match the expected schema and data types.
 */
export async function test_api_seller_profile_retrieve_existing(
  connection: api.IConnection,
) {
  // 1. Create seller account to generate a valid seller profile
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(seller);
  // 2. Extract the seller profile ID from the authorization response
  const profileId: string & tags.Format<"uuid"> = seller.id;
  // 3. Retrieve the seller profile using the public endpoint (no authentication)
  const publicConnection: api.IConnection = { host: connection.host };
  const profile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.customer.profiles.at(publicConnection, {
      profileId,
    });
  typia.assert(profile);
  // 4. Validate all response fields
  TestValidator.equals("profile id matches seller id", profile.id, profileId);
  TestValidator.predicate(
    "shop name is non-empty",
    profile.shop_name.length > 0,
  );
  TestValidator.predicate(
    "shop description is non-empty",
    profile.shop_description.length > 0,
  );
  TestValidator.predicate(
    "approval status is valid",
    ["pending", "approved", "rejected"].includes(profile.approval_status),
  );
  TestValidator.equals(
    "new seller is not suspended",
    profile.is_suspended,
    false,
  );
  TestValidator.equals("new seller is not banned", profile.is_banned, false);
  TestValidator.predicate(
    "created_at is valid datetime",
    profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    profile.updated_at.length > 0,
  );
  TestValidator.equals("profile is not deleted", profile.deleted_at, null);
}
