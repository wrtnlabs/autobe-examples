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

export async function test_api_member_profile_update_own_profile(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await api.functional.communityPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphabets(12),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(joined);
  const firstDisplayName = RandomGenerator.name();
  const firstBio = RandomGenerator.paragraph({ sentences: 4 });
  const firstAvatarImageUri = `https://example.com/${RandomGenerator.alphabets(10)}.jpg`;
  const updated = await api.functional.communityPlatform.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: firstDisplayName,
        bio: firstBio,
        avatarImageUri: firstAvatarImageUri,
      } satisfies ICommunityPlatformMember.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("member id preserved", updated.id, joined.id);
  TestValidator.equals("email preserved", updated.email, joined.email);
  TestValidator.equals("username preserved", updated.username, joined.username);
  TestValidator.equals("karma preserved", updated.karma, joined.karma);
  TestValidator.equals(
    "createdAt preserved",
    updated.createdAt,
    joined.createdAt,
  );
  TestValidator.equals(
    "deletedAt preserved",
    updated.deletedAt,
    joined.deletedAt,
  );
  TestValidator.equals(
    "display name updated",
    updated.displayName,
    firstDisplayName,
  );
  TestValidator.equals("bio updated", updated.bio, firstBio);
  TestValidator.equals(
    "avatar updated",
    updated.avatarImageUri,
    firstAvatarImageUri,
  );
  const secondDisplayName = RandomGenerator.name();
  const partiallyUpdated =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: secondDisplayName,
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(partiallyUpdated);
  TestValidator.equals(
    "id preserved after partial update",
    partiallyUpdated.id,
    joined.id,
  );
  TestValidator.equals(
    "username preserved after partial update",
    partiallyUpdated.username,
    joined.username,
  );
  TestValidator.equals(
    "email preserved after partial update",
    partiallyUpdated.email,
    joined.email,
  );
  TestValidator.equals(
    "karma preserved after partial update",
    partiallyUpdated.karma,
    updated.karma,
  );
  TestValidator.equals(
    "createdAt preserved after partial update",
    partiallyUpdated.createdAt,
    updated.createdAt,
  );
  TestValidator.equals(
    "display name updated on partial update",
    partiallyUpdated.displayName,
    secondDisplayName,
  );
  TestValidator.equals(
    "bio preserved when omitted",
    partiallyUpdated.bio,
    updated.bio,
  );
  TestValidator.equals(
    "avatar preserved when omitted",
    partiallyUpdated.avatarImageUri,
    updated.avatarImageUri,
  );
}
