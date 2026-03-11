import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to establish authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: "Original Name",
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: "https://example.com/avatar.png",
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(joined);
  // Store original values for validation
  const originalBio = joined.bio;
  const originalAvatarUrl = joined.avatar_url;
  // 2. Update display name only
  const newName = "Updated Display Name";
  const output = await api.functional.redditLike.member.profile.updateProfile(
    memberConnection,
    {
      body: {
        display_name: newName,
      } satisfies IRedditLikeMember.IUpdate,
    },
  );
  typia.assert(output);
  // 3. Validate that only display_name changed, bio and avatar_url preserved
  TestValidator.equals("display_name updated", output.display_name, newName);
  TestValidator.equals("bio preserved", output.bio, originalBio);
  TestValidator.equals(
    "avatar_url preserved",
    output.avatar_url,
    originalAvatarUrl,
  );
}
