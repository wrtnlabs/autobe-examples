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
 * Test customer profile update operation where a registered member updates both display name and phone number simultaneously.
 *
 * Validates the complete profile update flow including member registration, authentication, and atomic update of both profile fields. Ensures that the profile update correctly modifies display_name and phone_number while preserving immutable fields like id, created_at, and deleted_at.
 *
 * Special attention is given to verifying that the updated_at timestamp reflects the modification time and that the member relation remains intact with correct account information after the update.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Capture original profile data including created_at, updated_at, id, display_name, and phone_number.
 * 3. Update profile with new display_name and phone_number values in a single atomic operation.
 * 4. Verify both fields are updated correctly in the response.
 * 5. Verify updated_at timestamp has changed from original value.
 * 6. Verify id, created_at, and deleted_at remain unchanged.
 * 7. Verify member relation is preserved with correct account information.
 */
export async function test_api_customer_profile_update_both_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(authorized);
  // Verify profile exists for registered member
  if (authorized.profile === null) {
    throw new Error("Profile should exist for registered member");
  }
  // 2. Capture original profile data before update
  const originalProfile = authorized.profile;
  const originalCreatedAt = originalProfile.created_at;
  const originalUpdatedAt = originalProfile.updated_at;
  const originalId = originalProfile.id;
  const originalDisplayName = originalProfile.display_name;
  const originalPhoneNumber = originalProfile.phone_number;
  const originalDeletedAt = originalProfile.deleted_at;
  // 3. Generate new values for profile update
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  // 4. Update profile with both fields
  const updatedProfile =
    await api.functional.shoppingMall.member.profile.update(memberConnection, {
      body: {
        displayName: newDisplayName,
        phoneNumber: newPhoneNumber,
      } satisfies IShoppingMallCustomerProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  // 5. Verify both fields are updated correctly
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone_number updated",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  // 6. Verify updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
  // 7. Verify immutable fields remain unchanged
  TestValidator.equals("id unchanged", updatedProfile.id, originalId);
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
  // 8. Verify member relation is preserved
  TestValidator.equals(
    "member id preserved",
    updatedProfile.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member email preserved",
    updatedProfile.member.email,
    authorized.email,
  );
}
