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
 * Test updating all profile fields (display_name, bio, avatar_url) for an authenticated member.
 * Verifies that:
 * - All three profile fields can be updated
 * - System-managed fields (karma, username, id) remain unchanged
 * - Response includes complete member profile
 * - Changes are persisted immediately
 */
export async function test_api_profile_full_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: typia.random<string & tags.Format<"url">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // Store original values for comparison
  const originalId = authResult.id;
  const originalUsername = authResult.username;
  const originalKarma = authResult.karma;
  const originalCreatedAt = authResult.createdAt;
  // 2. Prepare update data with new values
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  const newAvatarUrl = typia.random<string & tags.Format<"url">>();
  const updateBody = {
    display_name: newDisplayName,
    bio: newBio,
    avatar_url: newAvatarUrl,
  } satisfies ICommunityPlatformMember.IUpdate;
  // 3. Call profile update API
  const updatedMember =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedMember);
  // 4. Verify updated values match provided values
  TestValidator.equals(
    "display_name matches",
    updatedMember.displayName,
    newDisplayName,
  );
  TestValidator.equals("bio matches", updatedMember.bio, newBio);
  TestValidator.equals(
    "avatar_url matches",
    updatedMember.avatarUrl,
    newAvatarUrl,
  );
  // 5. Verify system-managed fields remain unchanged
  TestValidator.equals("id unchanged", updatedMember.id, originalId);
  TestValidator.equals(
    "username unchanged",
    updatedMember.username,
    originalUsername,
  );
  TestValidator.equals("karma unchanged", updatedMember.karma, originalKarma);
  // 6. Verify created_at remains the same
  TestValidator.equals(
    "created_at unchanged",
    updatedMember.createdAt,
    originalCreatedAt,
  );
  // 7. Verify updated_at is at or after created_at (timestamp validation)
  TestValidator.predicate(
    "updated_at >= created_at",
    new Date(updatedMember.updatedAt).getTime() >=
      new Date(updatedMember.createdAt).getTime(),
  );
}
