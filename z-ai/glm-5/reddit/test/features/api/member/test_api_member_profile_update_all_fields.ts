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
 * Test successful profile update with all three fields (display_name, bio, avatar_url).
 * After member registration, call the profile update endpoint with a valid display name
 * (1-50 characters, supporting Unicode for international names), a bio text under 500
 * characters, and a valid avatar URL. Verify the response contains the updated member
 * profile with all new values correctly stored.
 */
export async function test_api_member_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration - create authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Store original values for comparison
  const originalUpdatedAt = member.updated_at;
  // 2. Prepare profile update data with all three fields
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const avatarUrl = typia.random<string & tags.Format<"url">>();
  const updateBody = {
    display_name: displayName,
    bio: bio,
    avatar_url: avatarUrl,
  } satisfies ICommunityMember.IUpdate;
  // 3. Call profile update endpoint
  const updatedMember = await api.functional.community.member.profile.update(
    memberConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedMember);
  // 4. Validate updated fields match submitted values
  TestValidator.equals(
    "display_name matches",
    updatedMember.display_name,
    displayName,
  );
  TestValidator.equals("bio matches", updatedMember.bio, bio);
  TestValidator.equals(
    "avatar_url matches",
    updatedMember.avatar_url,
    avatarUrl,
  );
  // 5. Verify updated_at has changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedMember.updated_at,
    originalUpdatedAt,
  );
  // 6. Verify immutable fields remain unchanged
  TestValidator.equals("id unchanged", updatedMember.id, member.id);
  TestValidator.equals(
    "username unchanged",
    updatedMember.username,
    member.username,
  );
  TestValidator.equals("karma unchanged", updatedMember.karma, member.karma);
  TestValidator.equals(
    "created_at unchanged",
    updatedMember.created_at,
    member.created_at,
  );
}
