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

export async function test_api_community_update_public_profile_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(joined);
  const created =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(created);
  const updated =
    await api.functional.communityPlatform.member.communities.update(
      memberConnection,
      {
        communityId: created.id,
        body: {
          name: `${created.name}-updated`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          icon_image_url: `https://example.com/${RandomGenerator.alphabets(8)}.jpg`,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "community id should be preserved",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "community name should be updated",
    updated.name,
    `${created.name}-updated`,
  );
  TestValidator.equals(
    "community description should be updated",
    updated.description,
    updated.description,
  );
  TestValidator.equals(
    "community icon image url should be updated",
    updated.iconImageUrl,
    `https://example.com/${RandomGenerator.alphabets(8)}.jpg`,
  );
}
