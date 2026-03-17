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

export async function test_api_member_profile_update_empty_display_name_uses_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // Store original username for verification
  const originalUsername = authResult.username;
  // 2. Update profile with empty display_name
  const updatedProfile =
    await api.functional.redditPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: "",
          bio: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Verify display_name equals username when empty
  TestValidator.equals(
    "display_name should equal username when empty provided",
    updatedProfile.display_name,
    originalUsername,
  );
  // 4. Verify other profile fields are updated correctly
  TestValidator.predicate(
    "bio should be updated",
    updatedProfile.bio !== null && updatedProfile.bio.length > 0,
  );
  // 5. Test with null display_name as well
  const updatedProfileWithNull =
    await api.functional.redditPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: null,
        } satisfies IRedditPlatformMember.IUpdate,
      },
    );
  typia.assert(updatedProfileWithNull);
  // 6. Verify null display_name also results in username
  TestValidator.equals(
    "display_name should equal username when null provided",
    updatedProfileWithNull.display_name,
    originalUsername,
  );
}