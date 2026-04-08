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
 * Test that an authenticated seller can retrieve their profile information.
 *
 * Validates the seller profile retrieval flow by first registering a new seller account and then accessing their profile endpoint. The test ensures that the profile response contains all expected fields including the seller's unique identifier, display name, optional phone number, and account timestamps.
 *
 * Special attention is given to verifying the data types and formats of the response fields, including UUID format for the id, nullable phone_number field, and ISO 8601 date-time format for timestamps.
 *
 * 1. Register a new seller account using the join endpoint with randomized credentials.
 * 2. The seller account is created with 'pending' approval status automatically.
 * 3. Retrieve the seller's profile using the authenticated profile endpoint.
 * 4. Validate that all expected fields are present in the response.
 * 5. Verify the data types and formats match the IShoppingMallCustomerProfile DTO specification.
 */
export async function test_api_seller_profile_retrieve_authenticated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(seller);
  // 2. Retrieve the seller's profile
  const profile =
    await api.functional.shoppingMall.seller.profile.at(sellerConnection);
  typia.assert(profile);
  // 3. Validate business logic: display name should not be empty
  TestValidator.predicate(
    "display name is not empty",
    profile.display_name.length > 0,
  );
  // 4. Validate business logic: timestamps should exist and be non-empty
  TestValidator.predicate(
    "created_at timestamp is not empty",
    profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is not empty",
    profile.updated_at.length > 0,
  );
  // 5. Validate phone_number nullable behavior
  TestValidator.predicate(
    "phone_number is properly nullable",
    profile.phone_number === null ||
      profile.phone_number === undefined ||
      typeof profile.phone_number === "string",
  );
}
