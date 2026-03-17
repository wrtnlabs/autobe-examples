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

export async function test_api_member_profile_partial_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
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
  typia.assert(joinResult);
  // Store original values for comparison
  const originalDisplayName = joinResult.display_name;
  const originalBio = joinResult.bio;
  const originalAvatar = joinResult.avatar;
  const originalUpdatedAt = joinResult.updated_at;
  // 2. Create new display name for update
  const newDisplayName = RandomGenerator.name();
  // 3. Update profile with only display_name (partial update)
  const updatedProfile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IRedditCloneUserProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 4. Verify display_name was updated to new value
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 5. Verify display_name actually changed from original
  TestValidator.notEquals(
    "display_name changed",
    originalDisplayName,
    updatedProfile.display_name,
  );
  // 6. Verify bio remains unchanged (null or original value)
  TestValidator.equals("bio unchanged", updatedProfile.bio, originalBio);
  // 7. Verify avatar remains unchanged (null or original value)
  TestValidator.equals(
    "avatar unchanged",
    updatedProfile.avatar,
    originalAvatar,
  );
  // 8. Verify updated_at timestamp reflects the recent change
  const originalTimestamp = new Date(originalUpdatedAt).getTime();
  const updatedTimestamp = new Date(updatedProfile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at reflects change",
    updatedTimestamp >= originalTimestamp,
  );
}
