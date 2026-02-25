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

export async function test_api_community_retrieval_with_active_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize member join
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.name(),
      },
    },
  );
  // 2. Create community
  const community: IRedditCommunity =
    await generate_random_reddit_member_communities_create(memberConnection, {
      body: {
        name: RandomGenerator.name().replace(/ /g, "_"),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: "https://example.com/icon.png",
      },
    });
  // 3. Subscribe to community
  await api.functional.reddit.member.communities.subscribe(memberConnection, {
    communityId: community.id,
  });
  // 4. Verify subscriber count
  const retrievedCommunity: IRedditCommunity =
    await api.functional.reddit.communities.at(connection, {
      communityId: community.id,
    });
  typia.assert(retrievedCommunity);
  TestValidator.equals(
    "subscriber count is 1",
    retrievedCommunity.subscriber_count,
    1,
  );
}
