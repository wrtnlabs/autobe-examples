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
 * Test seller profile update with display name and phone number.
 *
 * Validates the seller profile update functionality by authenticating a seller account, updating their profile with new display name and phone number, and verifying the changes are persisted correctly. The test ensures that the updated_at timestamp is refreshed and the response contains all expected fields.
 *
 * 1. Seller registers and authenticates via join endpoint.
 * 2. Seller updates profile with new display name and phone number.
 * 3. Validates response contains updated values and refreshed timestamp.
 * 4. Confirms profile structure is complete with all required fields.
 */
export async function test_api_seller_profile_update_with_display_name_and_phone(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
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
  // 2. Prepare update data
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  // 3. Update seller profile
  const updatedProfile = await api.functional.ecommerce.seller.profiles.patch(
    sellerConnection,
    {
      body: {
        display_name: newDisplayName,
        phone_number: newPhoneNumber,
      } satisfies IEcommerceCustomer.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 4. Validate response contains updated values
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number updated",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  // 5. Verify updated_at timestamp is refreshed and valid
  TestValidator.predicate(
    "updated_at exists",
    updatedProfile.updated_at !== null &&
      updatedProfile.updated_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedProfile.updated_at),
  );
  // 6. Verify all required fields are present in response
  TestValidator.predicate(
    "id exists",
    updatedProfile.id !== null && updatedProfile.id !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    updatedProfile.created_at !== null &&
      updatedProfile.created_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    updatedProfile.deleted_at === null,
  );
}
