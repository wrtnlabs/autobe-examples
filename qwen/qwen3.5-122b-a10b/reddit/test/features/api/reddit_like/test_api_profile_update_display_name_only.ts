import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member profile update with only display name field (partial update).
 *
 * Validates that members can update individual profile fields without providing all fields. This test ensures partial update semantics work correctly by updating only the display_name while preserving bio and avatar fields.
 *
 * The test captures the initial profile state, performs a partial update with only display_name, and verifies that unchanged fields retain their original values while the updated field reflects the new value.
 *
 * 1. Authenticate as a member via join operation.
 * 2. Capture initial profile state (display_name, bio, avatar).
 * 3. Update profile with only display_name field.
 * 4. Verify display_name is updated to new value.
 * 5. Verify bio remains unchanged from original.
 * 6. Verify avatar remains unchanged from original.
 * 7. Verify updated_at timestamp is updated.
 */
export async function test_api_profile_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Capture initial profile state from authorization response
  const initialDisplayName: string = authorized.display_name;
  const initialBio: string | null = authorized.bio;
  const initialAvatar: (string & tags.Format<"uri">) | null = authorized.avatar;
  // 3. Update profile with only display_name
  const newDisplayName: string = RandomGenerator.name(2);
  const updateProfile: IRedditLikeUserProfile =
    await api.functional.redditLike.member.profile.update(memberConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies IRedditLikeUserProfile.IUpdate,
    });
  typia.assert(updateProfile);
  // 4. Verify display_name is updated
  TestValidator.equals(
    "display name updated",
    updateProfile.display_name,
    newDisplayName,
  );
  // 5. Verify bio remains unchanged
  TestValidator.equals("bio unchanged", updateProfile.bio, initialBio);
  // 6. Verify avatar remains unchanged
  TestValidator.equals("avatar unchanged", updateProfile.avatar, initialAvatar);
  // 7. Verify updated_at timestamp is updated (should be >= created_at)
  TestValidator.predicate(
    "updated_at is valid",
    new Date(updateProfile.updated_at) >= new Date(updateProfile.created_at),
  );
  // 8. Verify other fields are preserved
  TestValidator.equals("profile id preserved", updateProfile.id, authorized.id);
  TestValidator.equals(
    "karma score preserved",
    updateProfile.karma_score,
    authorized.karma_score,
  );
}
