import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test clearing optional profile fields (bio, avatar) by setting them to null.
 *
 * This test validates that members can remove optional profile information
 * by updating their profile with null values for bio and/or avatar fields.
 * The test verifies:
 * 1. Bio can be cleared by setting to null
 * 2. Avatar can be cleared by setting to null
 * 3. Display name remains unchanged when not provided in update
 * 4. Updated_at timestamp is updated on each modification
 */
export async function test_api_profile_update_clear_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with initial profile data
  const memberConnection: api.IConnection = { host: connection.host };
  const initialBio = RandomGenerator.paragraph({ sentences: 2 });
  const initialAvatar = typia.random<string & tags.Format<"uri">>();
  const initialDisplayName = RandomGenerator.name();
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      display_name: initialDisplayName,
    },
  });
  typia.assert(joinResult);
  // 2. Initial profile update - set bio and avatar
  const initialUpdateBody = {
    bio: initialBio,
    avatar: initialAvatar,
  } satisfies IRedditCloneUserProfile.IUpdate;
  const initialProfile = await api.functional.redditClone.profiles.update(
    memberConnection,
    {
      body: initialUpdateBody,
    },
  );
  typia.assert(initialProfile);
  // Validate initial profile has bio and avatar set
  TestValidator.equals("bio matches initial", initialProfile.bio, initialBio);
  TestValidator.equals(
    "avatar matches initial",
    initialProfile.avatar,
    initialAvatar,
  );
  TestValidator.equals(
    "display_name matches",
    initialProfile.display_name,
    initialDisplayName,
  );
  // 3. Clear bio by setting to null
  const clearBioBody = {
    bio: null,
  } satisfies IRedditCloneUserProfile.IUpdate;
  const profileAfterClearBio = await api.functional.redditClone.profiles.update(
    memberConnection,
    {
      body: clearBioBody,
    },
  );
  typia.assert(profileAfterClearBio);
  // Validate bio is cleared, avatar and display_name unchanged
  TestValidator.equals(
    "bio is null after clear",
    profileAfterClearBio.bio,
    null,
  );
  TestValidator.equals(
    "avatar unchanged",
    profileAfterClearBio.avatar,
    initialAvatar,
  );
  TestValidator.equals(
    "display_name unchanged",
    profileAfterClearBio.display_name,
    initialDisplayName,
  );
  TestValidator.predicate(
    "updated_at changed",
    profileAfterClearBio.updated_at > initialProfile.updated_at,
  );
  // 4. Clear avatar by setting to null
  const clearAvatarBody = {
    avatar: null,
  } satisfies IRedditCloneUserProfile.IUpdate;
  const profileAfterClearAvatar =
    await api.functional.redditClone.profiles.update(memberConnection, {
      body: clearAvatarBody,
    });
  typia.assert(profileAfterClearAvatar);
  // Validate avatar is cleared, bio remains null, display_name unchanged
  TestValidator.equals(
    "avatar is null after clear",
    profileAfterClearAvatar.avatar,
    null,
  );
  TestValidator.equals("bio remains null", profileAfterClearAvatar.bio, null);
  TestValidator.equals(
    "display_name unchanged",
    profileAfterClearAvatar.display_name,
    initialDisplayName,
  );
  TestValidator.predicate(
    "updated_at changed",
    profileAfterClearAvatar.updated_at > profileAfterClearBio.updated_at,
  );
  // 5. Clear both bio and avatar simultaneously (redundant but validates the pattern)
  const clearBothBody = {
    bio: null,
    avatar: null,
  } satisfies IRedditCloneUserProfile.IUpdate;
  const profileAfterClearBoth =
    await api.functional.redditClone.profiles.update(memberConnection, {
      body: clearBothBody,
    });
  typia.assert(profileAfterClearBoth);
  // Validate both fields are null, display_name unchanged
  TestValidator.equals("bio is null", profileAfterClearBoth.bio, null);
  TestValidator.equals("avatar is null", profileAfterClearBoth.avatar, null);
  TestValidator.equals(
    "display_name unchanged",
    profileAfterClearBoth.display_name,
    initialDisplayName,
  );
  TestValidator.predicate(
    "updated_at changed",
    profileAfterClearBoth.updated_at > profileAfterClearAvatar.updated_at,
  );
}
