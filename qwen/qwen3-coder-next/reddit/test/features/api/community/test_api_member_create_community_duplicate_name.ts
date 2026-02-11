import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_member_create_community_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first community
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberInfo);
  // Update connection with token from registration
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberInfo.token.access,
    },
  };
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      authenticatedConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // 2. Attempt to create duplicate community (same name)
  const duplicatedCommunity = community1.name;
  await TestValidator.error("duplicate community name error", async () => {
    await api.functional.redditPlatform.member.communities.create(
      authenticatedConnection,
      {
        body: {
          name: duplicatedCommunity,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  });
}
