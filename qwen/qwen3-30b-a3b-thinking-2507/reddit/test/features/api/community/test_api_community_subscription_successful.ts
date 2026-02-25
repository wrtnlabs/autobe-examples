import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_communities_create } from "../../../generate/generate_random_reddit_member_communities_create";
import { prepare_random_reddit_community } from "../../../prepare/prepare_random_reddit_community";

export async function test_api_community_subscription_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secret123",
      username: RandomGenerator.name(2),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Create a new community
  const community = await generate_random_reddit_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(1) + "-community",
        description: "Test community for integration testing",
      } satisfies IRedditCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription = await api.functional.reddit.member.communities.subscribe(
    memberConnection,
    {
      communityId: community.id satisfies string & tags.Format<"uuid">,
    },
  );
  typia.assert(subscription);
  // 4. Verify subscription ID is returned
  TestValidator.equals(
    "subscription ID exists",
    subscription.id !== undefined,
    true,
  );
  // 5. Verify community link in subscription
  TestValidator.equals(
    "community in subscription",
    subscription.community.id,
    community.id,
  );
}
