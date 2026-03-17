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
 * Test the complete profile update workflow where a member updates all three profile fields simultaneously.
 *
 * This test validates:
 * 1. Member registration via authorize_member_join utility
 * 2. Profile update with all three fields (display_name, bio, avatar)
 * 3. Response contains all updated values
 * 4. updated_at timestamp changes from original created_at
 * 5. username remains unchanged (computed field)
 */
export async function test_api_member_profile_full_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account and obtain authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Store original timestamps for comparison
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;
  // 3. Prepare profile update with all three fields
  const updateBody = {
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    bio: RandomGenerator.content({ paragraphs: 2 }),
    avatar: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneUserProfile.IUpdate;
  // 4. Update profile with all fields
  const updatedProfile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedProfile);
  // 5. Verify all updated fields are reflected
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    updateBody.display_name,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, updateBody.bio);
  TestValidator.equals(
    "avatar updated",
    updatedProfile.avatar,
    updateBody.avatar,
  );
  // 6. Verify updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
  // 7. Verify username remains unchanged
  TestValidator.equals(
    "username unchanged",
    updatedProfile.username,
    authorized.username,
  );
  // 8. Verify created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
}
