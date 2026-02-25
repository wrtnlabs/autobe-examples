import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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
 * Test that profile updates are correctly reflected when retrieving the authenticated member's profile.
 *
 * This test validates:
 * 1. GET profile returns all updated values correctly
 * 2. Immutable fields (username, id, created_at) remain unchanged
 * 3. updated_at timestamp reflects the recent modification time
 * 4. karma remains unaffected by profile updates
 * 5. email field remains visible as private information
 */
export async function test_api_member_profile_after_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Get initial profile before updates
  const initialProfile =
    await api.functional.community.member.profile.at(memberConnection);
  typia.assert(initialProfile);
  // Store immutable field values for comparison
  const immutableId = initialProfile.id;
  const immutableUsername = initialProfile.username;
  const immutableCreatedAt = initialProfile.created_at;
  const initialKarma = initialProfile.karma;
  const initialEmail = initialProfile.email;
  // Wait a moment to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Update profile with new values
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 5 });
  const newAvatarUrl = `https://example.com/avatars/${RandomGenerator.alphaNumeric(16)}.jpg`;
  const updateBody = {
    display_name: newDisplayName,
    bio: newBio,
    avatar_url: newAvatarUrl,
  } satisfies ICommunityMember.IUpdate;
  const updatedProfile = await api.functional.community.member.profile.update(
    memberConnection,
    { body: updateBody },
  );
  typia.assert(updatedProfile);
  // 4. Get profile again to verify persistence
  const retrievedProfile =
    await api.functional.community.member.profile.at(memberConnection);
  typia.assert(retrievedProfile);
  // 5. Validate updated values are correctly reflected
  TestValidator.equals(
    "display_name should be updated",
    retrievedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio should be updated", retrievedProfile.bio, newBio);
  TestValidator.equals(
    "avatar_url should be updated",
    retrievedProfile.avatar_url,
    newAvatarUrl,
  );
  // 6. Validate immutable fields remain unchanged
  TestValidator.equals(
    "id should remain unchanged",
    retrievedProfile.id,
    immutableId,
  );
  TestValidator.equals(
    "username should remain unchanged",
    retrievedProfile.username,
    immutableUsername,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    retrievedProfile.created_at,
    immutableCreatedAt,
  );
  // 7. Validate karma is unaffected by profile updates
  TestValidator.equals(
    "karma should remain unchanged",
    retrievedProfile.karma,
    initialKarma,
  );
  // 8. Validate email field is visible (private information)
  TestValidator.equals(
    "email should be visible",
    retrievedProfile.email,
    initialEmail,
  );
  // 9. Validate updated_at reflects the recent modification
  TestValidator.predicate(
    "updated_at should be more recent than created_at",
    new Date(retrievedProfile.updated_at).getTime() >=
      new Date(immutableCreatedAt).getTime(),
  );
  // 10. Validate updated_at changed after update
  TestValidator.predicate(
    "updated_at should have changed",
    new Date(retrievedProfile.updated_at).getTime() >
      new Date(initialProfile.updated_at).getTime(),
  );
}
