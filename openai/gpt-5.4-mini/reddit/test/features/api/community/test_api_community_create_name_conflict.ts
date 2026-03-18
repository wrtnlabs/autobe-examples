import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_create_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      username: `user_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const communityName = `community_${RandomGenerator.alphabets(10)}`;
  const communityDescription = RandomGenerator.paragraph({ sentences: 2 });
  const communityIconImageUrl = `https://example.com/${RandomGenerator.alphabets(8)}.png`;
  const created =
    await api.functional.communityPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          iconImageUrl: communityIconImageUrl,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals("community name matches", created.name, communityName);
  TestValidator.equals(
    "community description matches",
    created.description,
    communityDescription,
  );
  TestValidator.equals(
    "community icon matches",
    created.iconImageUrl,
    communityIconImageUrl,
  );
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      username: `user_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await TestValidator.error(
    "duplicate community name should be rejected",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        member2Connection,
        {
          body: {
            name: communityName,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            iconImageUrl: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original community name remains intact",
    created.name,
    communityName,
  );
  TestValidator.equals(
    "original community description remains intact",
    created.description,
    communityDescription,
  );
  TestValidator.equals(
    "original community icon remains intact",
    created.iconImageUrl,
    communityIconImageUrl,
  );
}
