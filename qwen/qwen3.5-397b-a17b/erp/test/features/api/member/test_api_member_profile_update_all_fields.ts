import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the complete profile update workflow where a member updates all three
 * profile fields (display name, avatar image, and phone number) simultaneously.
 *
 * This test validates:
 * 1. Member registration and authentication
 * 2. Profile update with all editable fields
 * 3. Response contains all updated values
 * 4. updated_at timestamp reflects the modification
 */
export async function test_api_member_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Prepare new profile data for all three fields
  const newDisplayName = RandomGenerator.name();
  const newAvatarImage = typia.random<string & tags.Format<"uri">>();
  const newPhoneNumber = RandomGenerator.mobile();
  const updateBody = {
    display_name: newDisplayName,
    avatar_image: newAvatarImage,
    phone_number: newPhoneNumber,
  } satisfies IHrmPlatformMember.IUpdate;
  // 3. Update profile with all fields
  const updatedProfile = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedProfile);
  // 4. Validate all fields were updated correctly
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "avatar image updated",
    updatedProfile.avatar_image,
    newAvatarImage,
  );
  TestValidator.equals(
    "phone number updated",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  // 5. Verify timestamps
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedProfile.updated_at) > new Date(updatedProfile.created_at),
  );
  // 6. Verify member identity preserved
  TestValidator.equals("member id preserved", updatedProfile.id, authorized.id);
  TestValidator.equals(
    "email preserved",
    updatedProfile.email,
    authorized.email,
  );
}
