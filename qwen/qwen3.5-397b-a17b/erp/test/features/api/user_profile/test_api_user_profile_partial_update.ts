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
 * Test successful partial update of user profile by modifying only the display name field.
 *
 * Validates the partial update functionality of the user profile endpoint by updating only the display_name field while preserving other profile fields. This ensures users can update individual profile attributes without needing to provide all fields, supporting flexible profile management workflows.
 *
 * The test authenticates a new member via the join operation, then submits a profile update request containing only the display_name field. The response is validated to confirm the display_name was updated while avatar_url and phone_number remain unchanged from their original values.
 *
 * 1. Register and authenticate a new member account with randomized credentials.
 * 2. Capture the initial profile state including display_name, avatar_url, and phone_number.
 * 3. Submit profile update request with only display_name field modified.
 * 4. Verify response contains updated display_name matching the new value.
 * 5. Verify avatar_url and phone_number remain unchanged from original values.
 * 6. Verify updated_at timestamp is later than the original created_at timestamp.
 */
export async function test_api_user_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Capture initial profile state
  const initialProfile = memberAuth.profile;
  TestValidator.predicate("profile exists after join", initialProfile !== null);
  const originalDisplayName = initialProfile!.display_name;
  const originalAvatarUrl = initialProfile!.avatar_url;
  const originalPhoneNumber = initialProfile!.phone_number;
  const originalCreatedAt = initialProfile!.created_at;
  // 3. Generate new display name and submit partial update
  const newDisplayName = RandomGenerator.name();
  const updateBody = {
    display_name: newDisplayName,
  } satisfies IHrmPlatformUserProfile.IUpdate;
  const updatedProfile = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedProfile);
  // 4. Verify display_name was updated
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display_name changed from original",
    updatedProfile.display_name,
    originalDisplayName,
  );
  // 5. Verify other fields remain unchanged
  TestValidator.equals(
    "avatar_url preserved",
    updatedProfile.avatar_url,
    originalAvatarUrl,
  );
  TestValidator.equals(
    "phone_number preserved",
    updatedProfile.phone_number,
    originalPhoneNumber,
  );
  // 6. Verify timestamps
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at reflects modification",
    new Date(updatedProfile.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
  // 7. Verify profile identity
  TestValidator.equals(
    "profile id unchanged",
    updatedProfile.id,
    initialProfile!.id,
  );
  TestValidator.equals(
    "member id unchanged",
    updatedProfile.member.id,
    memberAuth.id,
  );
}
