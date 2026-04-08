import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test partial profile update where only display_name is modified.
 *
 * Validates the partial update behavior of the profile update endpoint by registering a new member, updating only the display_name field, and verifying that omitted fields (bio, avatar_url) remain unchanged while the display_name is successfully updated.
 *
 * The test ensures that the backend correctly implements partial update logic, preserving existing field values when they are not included in the update request. This is critical for user experience as it allows members to update individual profile attributes without resubmitting all their profile data.
 *
 * 1. Register new member account using authorize_member_join utility which creates account with randomized credentials and returns authentication tokens.
 * 2. Store original profile values (display_name, bio, avatar, id, username, karma) before update for comparison.
 * 3. Call PUT /redditCommunity/member/profile with only display_name field in request body, explicitly omitting bio and avatar_url.
 * 4. Verify response contains the new display_name matching the update request.
 * 5. Verify bio remains null (unchanged from registration default).
 * 6. Verify avatar_url remains null (unchanged from registration default).
 * 7. Verify id, username, and karma remain identical to original values.
 * 8. Verify updated_at and created_at are valid ISO date-time strings.
 * 9. Verify deleted_at remains null indicating active account.
 */
export async function test_api_profile_update_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Store original profile values for comparison
  const originalDisplayName = authorized.display_name;
  const originalBio = authorized.bio;
  const originalAvatar = authorized.avatar;
  const originalId = authorized.id;
  const originalUsername = authorized.username;
  const originalKarma = authorized.karma;
  // 3. Generate new display name for update
  const newDisplayName = RandomGenerator.name();
  // 4. Call profile update with only display_name field (partial update)
  const updateBody = {
    display_name: newDisplayName,
  } satisfies IRedditCommunityUserProfile.IUpdate;
  const updatedProfile =
    await api.functional.redditCommunity.member.profile.update(
      memberConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 5. Verify display_name was updated to new value
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
  // 6. Verify bio remains null (unchanged from registration)
  TestValidator.equals("bio remains null", updatedProfile.bio, null);
  TestValidator.equals("bio matches original", updatedProfile.bio, originalBio);
  // 7. Verify avatar_url remains null (unchanged from registration)
  TestValidator.equals(
    "avatar_url remains null",
    updatedProfile.avatar_url,
    null,
  );
  TestValidator.equals(
    "avatar_url matches original",
    updatedProfile.avatar_url,
    originalAvatar,
  );
  // 8. Verify immutable fields remain unchanged
  TestValidator.equals("id unchanged", updatedProfile.id, originalId);
  TestValidator.equals(
    "username unchanged",
    updatedProfile.username,
    originalUsername,
  );
  TestValidator.equals("karma unchanged", updatedProfile.karma, originalKarma);
  // 9. Verify timestamp fields are valid
  TestValidator.predicate("created_at is valid date", () => {
    const createdAt = new Date(updatedProfile.created_at);
    return !isNaN(createdAt.getTime());
  });
  TestValidator.predicate("updated_at is valid date", () => {
    const updatedAt = new Date(updatedProfile.updated_at);
    return !isNaN(updatedAt.getTime());
  });
  TestValidator.predicate("updated_at is not before created_at", () => {
    const updatedAt = new Date(updatedProfile.updated_at);
    const createdAt = new Date(updatedProfile.created_at);
    return updatedAt.getTime() >= createdAt.getTime();
  });
  // 10. Verify account is active (not deleted)
  TestValidator.equals("deleted_at is null", updatedProfile.deleted_at, null);
}
