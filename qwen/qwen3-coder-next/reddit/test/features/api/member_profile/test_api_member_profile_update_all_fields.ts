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

export async function test_api_member_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to establish authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: RandomGenerator.pick([
        "https://example.com/avatar.png",
        null,
      ]) as any,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(joined);
  // 2. Update profile with all fields
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.content({ paragraphs: 2 });
  const newAvatarUrl = RandomGenerator.pick([
    "https://example.com/new-avatar.png",
    null,
  ]) as any;
  const updated = await api.functional.redditLike.member.profile.updateProfile(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
        bio: newBio,
        avatar_url: newAvatarUrl,
      } satisfies IRedditLikeMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Validate business logic - updated fields match input
  TestValidator.equals(
    "display_name matches update",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio matches update", updated.bio, newBio);
  TestValidator.equals(
    "avatar_url matches update",
    updated.avatar_url,
    newAvatarUrl,
  );
}
