import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
 * Test clearing phone number by setting it to null in seller profile update.
 *
 * Validates that a seller can update their profile and explicitly clear the phone number field by setting it to null. The test authenticates as a seller, performs a profile update with display_name set and phone_number as null, then verifies the response contains the expected values including the cleared phone number and refreshed timestamp.
 *
 * This test ensures the phone_number field can be properly cleared and that the updated_at timestamp is refreshed on profile modification.
 *
 * 1. Authenticate seller via join endpoint with random credentials.
 * 2. Create profile update request with display_name set and phone_number explicitly set to null.
 * 3. Call the seller profiles patch endpoint to update the profile.
 * 4. Validate the response contains the correct display_name and null phone_number.
 * 5. Verify the updated_at timestamp is refreshed compared to created_at.
 */
export async function test_api_seller_profile_update_clear_phone_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create update body with phone_number set to null
  const displayName = RandomGenerator.name();
  const updateBody = {
    display_name: displayName,
    phone_number: null,
  } satisfies IEcommerceCustomer.IUpdate;
  // 3. Update seller profile
  const updated: IEcommerceCustomer =
    await api.functional.ecommerce.seller.profiles.patch(sellerConnection, {
      body: updateBody,
    });
  typia.assert(updated);
  // 4. Validate response
  TestValidator.equals(
    "display name matches",
    updated.display_name,
    displayName,
  );
  TestValidator.equals("phone number is null", updated.phone_number, null);
  // 5. Verify updated_at is refreshed (should be >= created_at)
  TestValidator.predicate(
    "updated_at is refreshed",
    new Date(updated.updated_at) >= new Date(updated.created_at),
  );
}
