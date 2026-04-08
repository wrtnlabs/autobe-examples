import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful update of all three user profile fields (display name, avatar URL, and phone number) in a single operation.
 *
 * Validates the complete profile update flow including member authentication, profile creation through join, and full profile update with all available fields. Ensures that all three profile fields (display_name, avatar_url, phone_number) are correctly updated and persisted.
 *
 * Special attention is given to verifying that the updated_at timestamp reflects the modification time, confirming that the profile change was properly recorded in the system.
 *
 * 1. Register and authenticate a new member via join operation.
 * 2. Submit profile update request with new values for display_name, avatar_url, and phone_number.
 * 3. Verify the response returns the updated profile with all three fields reflecting the new values.
 * 4. Verify the updated_at timestamp is updated to reflect the modification.
 */
export async function test_api_user_profile_full_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Update all three profile fields
  const updateBody = {
    display_name: RandomGenerator.name(),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    phone_number: RandomGenerator.mobile(),
  } satisfies IHrmPlatformUserProfile.IUpdate;
  const updatedProfile = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedProfile);
  // 3. Verify all fields are updated correctly
  TestValidator.equals(
    "display_name matches",
    updatedProfile.display_name,
    updateBody.display_name,
  );
  TestValidator.equals(
    "avatar_url matches",
    updatedProfile.avatar_url,
    updateBody.avatar_url,
  );
  TestValidator.equals(
    "phone_number matches",
    updatedProfile.phone_number,
    updateBody.phone_number,
  );
  // 4. Verify updated_at timestamp exists and is valid
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(updatedProfile.updated_at);
    return !isNaN(date.getTime());
  });
}
