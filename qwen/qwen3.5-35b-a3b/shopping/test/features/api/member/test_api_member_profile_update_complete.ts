import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test customer profile update operation with both display name and phone number changes.
 *
 * Validates the complete profile update flow for authenticated members, verifying that both
 * display name and phone number can be updated simultaneously while preserving immutable
 * account fields like id, email, and created_at timestamp.
 *
 * 1. Register a new member account with initial display name and phone number.
 * 2. Update the profile with new display name and phone number values.
 * 3. Verify the updated profile contains the new display name and phone number.
 * 4. Verify updated_at timestamp was modified to reflect the profile change.
 * 5. Verify immutable fields (id, email, created_at) remain unchanged after update.
 */
export async function test_api_member_profile_update_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account with initial profile
  const memberConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = "Alice Johnson";
  const initialPhoneNumber = "+821098765432";
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: initialDisplayName,
      phone_number: initialPhoneNumber,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(joined);
  // 2. Update profile with new display name and phone number
  const newDisplayName = "Alice Smith-Jones";
  const newPhoneNumber = "+14155552671";
  const updateBody = {
    display_name: newDisplayName,
    phone_number: newPhoneNumber,
  } satisfies IEcommerceMallMember.IUpdate;
  // Update the connection header with access token from join response
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: joined.token.access,
  };
  const updatedProfile =
    await api.functional.ecommerceMall.member.profile.update(memberConnection, {
      body: updateBody,
    });
  typia.assert(updatedProfile);
  // 3. Verify display name was updated correctly
  TestValidator.equals(
    "display_name updated to hyphenated name",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 4. Verify phone number was updated correctly
  TestValidator.equals(
    "phone_number updated to international format",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  // 5. Verify updated_at timestamp changed from initial
  TestValidator.notEquals(
    "updated_at timestamp reflects profile modification",
    joined.updated_at,
    updatedProfile.updated_at,
  );
  // 6. Verify id, email, and created_at remain unchanged
  TestValidator.equals(
    "id remains unchanged after profile update",
    updatedProfile.id,
    joined.id,
  );
  TestValidator.equals(
    "email remains unchanged after profile update",
    updatedProfile.email,
    joined.email,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged after profile update",
    updatedProfile.created_at,
    joined.created_at,
  );
}
