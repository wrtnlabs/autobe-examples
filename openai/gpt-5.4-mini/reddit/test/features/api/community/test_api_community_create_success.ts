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

export async function test_api_community_create_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(joined);
  const communityBody = {
    name: `community-${RandomGenerator.alphabets(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    iconImageUrl: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const created =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: communityBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "community name should match input",
    created.name,
    communityBody.name,
  );
  TestValidator.equals(
    "community description should match input",
    created.description,
    communityBody.description,
  );
  TestValidator.equals(
    "community icon should match input",
    created.iconImageUrl,
    communityBody.iconImageUrl,
  );
  TestValidator.equals(
    "deletedAt should be null for active community",
    created.deletedAt,
    null,
  );
  TestValidator.predicate(
    "community should have active lifecycle status",
    created.status.length > 0,
  );
  TestValidator.predicate(
    "createdAt should be a populated timestamp",
    created.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be a populated timestamp",
    created.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "owner summary should be present",
    typeof created.owner === "object" && created.owner !== null,
  );
}
