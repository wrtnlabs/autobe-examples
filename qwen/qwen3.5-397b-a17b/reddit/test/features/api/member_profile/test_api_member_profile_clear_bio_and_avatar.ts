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
 * Test clearing optional profile fields by setting bio and avatar to null values.
 *
 * Test Flow:
 * 1. Create a new member account via authorize_member_join utility
 * 2. First update the profile with non-null bio and avatar values
 * 3. Call the profile update endpoint again with bio and avatar explicitly set to null
 * 4. Verify the response shows bio and avatar as null
 * 5. Verify display_name remains unchanged
 * 6. Verify updated_at timestamp reflects the latest modification
 */
export async function test_api_member_profile_clear_bio_and_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
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
  // Store original display_name for later verification
  const originalDisplayName = authorized.display_name;
  // 2. First update: Set bio and avatar to non-null values
  const bioValue = RandomGenerator.paragraph({ sentences: 3 });
  const avatarValue = typia.random<string & tags.Format<"uri">>();
  const firstUpdate = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: originalDisplayName,
        bio: bioValue,
        avatar: avatarValue,
      } satisfies IRedditCloneUserProfile.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // Verify first update set the values correctly
  TestValidator.equals("bio set in first update", firstUpdate.bio, bioValue);
  TestValidator.equals(
    "avatar set in first update",
    firstUpdate.avatar,
    avatarValue,
  );
  TestValidator.equals(
    "display_name unchanged after first update",
    firstUpdate.display_name,
    originalDisplayName,
  );
  // Store timestamp before second update for comparison
  const firstUpdateTimestamp = firstUpdate.updated_at;
  // Wait a small amount to ensure timestamp difference (optional, but good practice)
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 3. Second update: Clear bio and avatar by setting them to null
  const secondUpdate = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: {
        bio: null,
        avatar: null,
      } satisfies IRedditCloneUserProfile.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // 4. Verify bio and avatar are now null
  TestValidator.equals("bio cleared to null", secondUpdate.bio, null);
  TestValidator.equals("avatar cleared to null", secondUpdate.avatar, null);
  // 5. Verify display_name remains unchanged
  TestValidator.equals(
    "display_name unchanged after clearing",
    secondUpdate.display_name,
    originalDisplayName,
  );
  // 6. Verify updated_at timestamp reflects the latest modification
  TestValidator.notEquals(
    "updated_at changed after second update",
    secondUpdate.updated_at,
    firstUpdateTimestamp,
  );
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(secondUpdate.updated_at);
    return !isNaN(date.getTime());
  });
}
