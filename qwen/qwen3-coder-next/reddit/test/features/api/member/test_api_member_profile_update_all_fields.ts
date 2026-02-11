import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(2),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinedMember);
  // 2. Create actor-specific connection using utility's updated connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Utility function automatically updates headers, so we can use joinedMember's connection directly
  // but we create a new one to follow the pattern and avoid any potential issues
  await authorize_member_join(memberConnection, {
    body: {
      email: joinedMember.email,
      password: RandomGenerator.alphaNumeric(16),
      username: joinedMember.username,
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 3. Update profile with all optional fields
  const updateBody = {
    display_name: RandomGenerator.name(3),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_url: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.png`,
  } satisfies IRedditPlatformMember.IUpdate;
  const updatedMember =
    await api.functional.redditPlatform.members.updateProfile(
      memberConnection,
      { body: updateBody },
    );
  typia.assert(updatedMember);
  // 4. Validate updated fields
  TestValidator.equals(
    "display_name updated",
    updatedMember.display_name,
    updateBody.display_name,
  );
  TestValidator.equals("bio updated", updatedMember.bio, updateBody.bio);
  TestValidator.equals(
    "avatar_url updated",
    updatedMember.avatar_url,
    updateBody.avatar_url,
  );
  // 5. Validate timestamp was updated (must be more recent than creation)
  TestValidator.predicate(
    "updated_at > created_at",
    () =>
      new Date(updatedMember.updated_at).getTime() >
      new Date(updatedMember.created_at).getTime(),
  );
}
