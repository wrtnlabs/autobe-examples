import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
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
import { generate_random_community_platform_member_communities_subscriptions_create } from "../../../generate/generate_random_community_platform_member_communities_subscriptions_create";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_subscription_requires_member_and_joinable_community(
  connection: api.IConnection,
): Promise<void> {
  const unauthorizedCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthenticated caller cannot subscribe to a community",
    [401, 403],
    async () => {
      await generate_random_community_platform_member_communities_subscriptions_create(
        connection,
        {
          params: {
            communityId: unauthorizedCommunityId,
          },
        },
      );
    },
  );
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: `Bearer ${member.token.access}`,
  };
  await TestValidator.httpError(
    "nonexistent or unjoinable community cannot be subscribed",
    [404, 409, 403],
    async () => {
      await generate_random_community_platform_member_communities_subscriptions_create(
        authorizedConnection,
        {
          params: {
            communityId: unauthorizedCommunityId,
          },
        },
      );
    },
  );
}
