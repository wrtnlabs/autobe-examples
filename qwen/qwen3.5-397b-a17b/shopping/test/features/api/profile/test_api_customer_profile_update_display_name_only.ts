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
 * Test customer profile partial update with display name only.
 *
 * Validates the partial profile update operation where a registered member updates only their display name while retaining the existing phone number. Ensures that omitted fields maintain their current values and the updated_at timestamp reflects the modification.
 *
 * This test verifies the core partial update behavior of the profile endpoint, confirming that the API correctly handles requests with only a subset of updatable fields. The phone number, which is not included in the update request, must remain at its original value from registration.
 *
 * 1. Register new member account with email, password, and session context.
 * 2. Capture original profile data including phone_number, created_at, and id for comparison.
 * 3. Call PUT /shoppingMall/member/profile with only display_name field in request body.
 * 4. Verify response contains updated display_name value matching the input.
 * 5. Verify phone_number remains unchanged from original registration value.
 * 6. Verify updated_at timestamp has been updated to reflect the modification.
 * 7. Verify all other profile fields (id, created_at, deleted_at, member) remain unchanged.
 */
export async function test_api_customer_profile_update_display_name_only(
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
  // Store original profile data for comparison
  const originalProfile = member.profile;
  TestValidator.predicate(
    "profile exists after registration",
    originalProfile !== null,
  );
  const originalPhoneNumber = originalProfile!.phone_number;
  const originalCreatedAt = originalProfile!.created_at;
  const originalId = originalProfile!.id;
  const originalUpdatedAt = originalProfile!.updated_at;
  const originalDeletedAt = originalProfile!.deleted_at;
  const originalMemberId = originalProfile!.member.id;
  const originalMemberEmail = originalProfile!.member.email;
  // 2. Update profile with display_name only (partial update)
  const newDisplayName = RandomGenerator.name();
  const updatedProfile =
    await api.functional.shoppingMall.member.profile.update(memberConnection, {
      body: {
        displayName: newDisplayName,
      } satisfies IShoppingMallCustomerProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  // 3. Verify display_name was updated
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 4. Verify phone_number remains unchanged
  TestValidator.equals(
    "phone_number unchanged",
    updatedProfile.phone_number,
    originalPhoneNumber,
  );
  // 5. Verify updated_at timestamp was updated
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
  // 6. Verify other fields remain unchanged
  TestValidator.equals("profile id unchanged", updatedProfile.id, originalId);
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedProfile.deleted_at,
    originalDeletedAt,
  );
  TestValidator.equals(
    "member id unchanged",
    updatedProfile.member.id,
    originalMemberId,
  );
  TestValidator.equals(
    "member email unchanged",
    updatedProfile.member.email,
    originalMemberEmail,
  );
}
