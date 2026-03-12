import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test partial profile update by changing only the bio field.
 *
 * This test verifies that:
 * 1. Member can authenticate successfully
 * 2. Member can retrieve current profile
 * 3. Member can update only the bio field while keeping display_name unchanged
 * 4. Response contains updated bio with unchanged display_name and avatar_uri
 * 5. updated_at timestamp is refreshed while created_at remains intact
 */
export async function test_api_member_profile_partial_update_bio_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      bio: null,
      avatar_uri: null,
    },
  });
  typia.assert(authorized);
  // 2. Store original profile values
  const originalDisplayName = authorized.display_name;
  const originalAvatarUri = authorized.avatar_uri;
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;
  // 3. Create new bio value
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  // 4. Update profile with only display_name (required) and new bio
  const updatedProfile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: originalDisplayName,
        bio: newBio,
      } satisfies IRedditCloneMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 5. Verify bio is updated
  TestValidator.equals("bio updated to new value", updatedProfile.bio, newBio);
  // 6. Verify display_name remains unchanged
  TestValidator.equals(
    "display_name unchanged",
    updatedProfile.display_name,
    originalDisplayName,
  );
  // 7. Verify avatar_uri remains unchanged (null)
  TestValidator.equals(
    "avatar_uri unchanged",
    updatedProfile.avatar_uri,
    originalAvatarUri,
  );
  // 8. Verify created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
  // 9. Verify updated_at is refreshed (should be different from original)
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
  // 10. Verify updated_at is after original updated_at
  TestValidator.predicate(
    "updated_at is after original",
    new Date(updatedProfile.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );
}
