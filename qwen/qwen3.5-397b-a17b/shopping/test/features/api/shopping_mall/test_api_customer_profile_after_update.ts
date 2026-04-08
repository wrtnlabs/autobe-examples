import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test customer profile update reflection in profile retrieval.
 *
 * Validates that profile modifications are immediately reflected when retrieving the customer profile. The test registers a new member, updates their profile with new display_name and phone_number, then retrieves the profile to verify all changes are correctly persisted and returned.
 *
 * The test ensures that the updated_at timestamp is automatically updated on modification while created_at remains immutable. It also validates that the profile maintains its one-to-one relationship with the member account after updates and that deleted_at remains null for active profiles.
 *
 * 1. Register new member account with unique email and password credentials.
 * 2. Update member profile with new display_name and phone_number values.
 * 3. Retrieve the updated profile using GET endpoint.
 * 4. Validate that display_name matches the updated value.
 * 5. Validate that phone_number matches the updated value.
 * 6. Validate that updated_at timestamp is later than created_at.
 * 7. Validate that deleted_at is null (profile is active).
 * 8. Validate that member relation correctly links to the original member account.
 */
export async function test_api_customer_profile_after_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // Store original timestamps for comparison
  const originalCreatedAt = member.created_at;
  // 2. Update profile with new values
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  const updatedProfile =
    await api.functional.shoppingMall.member.profile.update(memberConnection, {
      body: {
        displayName: newDisplayName,
        phoneNumber: newPhoneNumber,
      } satisfies IShoppingMallCustomerProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  // 3. Retrieve the updated profile
  const retrievedProfile =
    await api.functional.shoppingMall.member.profile.at(memberConnection);
  typia.assert(retrievedProfile);
  // 4. Validate display_name matches updated value
  TestValidator.equals(
    "display_name matches update",
    retrievedProfile.display_name,
    newDisplayName,
  );
  // 5. Validate phone_number matches updated value
  TestValidator.equals(
    "phone_number matches update",
    retrievedProfile.phone_number,
    newPhoneNumber,
  );
  // 6. Validate updated_at is later than created_at
  const createdAtTime = new Date(retrievedProfile.created_at).getTime();
  const updatedAtTime = new Date(retrievedProfile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedAtTime > createdAtTime,
  );
  // 7. Validate deleted_at is null (profile is active)
  TestValidator.equals("deleted_at is null", retrievedProfile.deleted_at, null);
  // 8. Validate member relation links to original member account
  TestValidator.equals(
    "member id matches",
    retrievedProfile.member.id,
    member.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedProfile.member.email,
    member.email,
  );
  // 9. Validate created_at remains unchanged from registration
  TestValidator.equals(
    "created_at unchanged",
    retrievedProfile.created_at,
    originalCreatedAt,
  );
}
