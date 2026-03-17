import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
 * Test successful profile update with all fields.
 *
 * This test validates that an authenticated member can successfully update
 * their profile with display_name and bio, and that these updates don't
 * affect other member properties like id, username, and karma.
 */
export async function test_api_member_profile_full_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Store original values for comparison
  const originalId = authorized.id;
  const originalUsername = authorized.username;
  const originalCreatedAt = authorized.createdAt;
  // 2. Generate update data
  const displayName = RandomGenerator.paragraph({ sentences: 1 });
  const bio = RandomGenerator.paragraph({ sentences: 5 });
  // 3. Update profile with display_name and bio
  const updated = await api.functional.communityPlatform.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: displayName,
        bio: bio,
      } satisfies ICommunityPlatformMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Verify display_name and bio are updated
  TestValidator.equals(
    "display_name updated",
    updated.displayName,
    displayName,
  );
  TestValidator.equals("bio updated", updated.bio, bio);
  // 5. Verify updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updated.updatedAt).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
  // 6. Verify karma remains 0 (unaffected by profile update)
  TestValidator.equals("karma unchanged", updated.karma, 0);
  // 7. Verify username and id remain unchanged
  TestValidator.equals("id unchanged", updated.id, originalId);
  TestValidator.equals(
    "username unchanged",
    updated.username,
    originalUsername,
  );
}
