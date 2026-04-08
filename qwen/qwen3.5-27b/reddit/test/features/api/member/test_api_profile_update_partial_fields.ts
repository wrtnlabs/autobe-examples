import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
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
 * Test that an authenticated member can update only specific profile fields (partial update) without affecting other fields.
 *
 * Validates the partial update functionality of the member profile endpoint. Tests that when only certain fields are submitted in the update request, those fields are updated while other fields remain unchanged. This ensures the IUpdate DTO correctly supports optional fields for partial updates.
 *
 * The test first establishes a complete profile with all fields (display_name, bio, avatar), then performs a partial update with only display_name to verify that bio and avatar are preserved.
 *
 * 1. Register a new member account with valid credentials
 * 2. Create member-specific connection for authenticated operations
 * 3. Update profile with all fields (display_name, bio, avatar) to establish initial state
 * 4. Capture the initial bio and avatar values for later comparison
 * 5. Perform partial update with only display_name field
 * 6. Validate that display_name is updated to the new value
 * 7. Validate that bio field retains its previous value
 * 8. Validate that avatar field retains its previous value
 * 9. Validate that karma score remains unchanged
 * 10. Validate that updated_at timestamp is updated
 */
export async function test_api_profile_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. First update: Set all profile fields to establish initial state
  const initialDisplayName = RandomGenerator.name();
  const initialBio = RandomGenerator.paragraph({ sentences: 3 });
  const initialAvatar = typia.random<string & tags.Format<"uri">>();
  const fullProfile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: initialDisplayName,
        bio: initialBio,
        avatar: initialAvatar,
      } satisfies IRedditCloneUserProfile.IUpdate,
    },
  );
  typia.assert(fullProfile);
  // Capture initial values
  const initialKarma = fullProfile.karma;
  const initialBioValue = fullProfile.bio;
  const initialAvatarValue = fullProfile.avatar;
  // 3. Partial update: Only update display_name
  const newDisplayName = RandomGenerator.name();
  const partialProfile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IRedditCloneUserProfile.IUpdate,
    },
  );
  typia.assert(partialProfile);
  // 4. Validate partial update results
  TestValidator.equals(
    "display_name updated to new value",
    partialProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "bio field retained previous value",
    partialProfile.bio,
    initialBioValue,
  );
  TestValidator.equals(
    "avatar field retained previous value",
    partialProfile.avatar,
    initialAvatarValue,
  );
  TestValidator.equals(
    "karma score remains unchanged",
    partialProfile.karma,
    initialKarma,
  );
  TestValidator.predicate("updated_at timestamp is valid date-time", () => {
    const updatedDate = new Date(partialProfile.updated_at);
    return !isNaN(updatedDate.getTime());
  });
}
