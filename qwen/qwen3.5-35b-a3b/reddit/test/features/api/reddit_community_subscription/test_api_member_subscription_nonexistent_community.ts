import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_member_subscription_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityMember.IJoin,
    });
  typia.assert(member);
  // 2. Create a new connection with the member's auth token
  const subscribedMemberConnection: api.IConnection = { host: connection.host };
  subscribedMemberConnection.headers = {
    ...subscribedMemberConnection.headers,
    Authorization: member.token.access,
  };
  // 3. Generate a non-existent UUID for the community
  const nonexistentCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to subscribe to the non-existent community
  await TestValidator.httpError(
    "should return 404 for non-existent community",
    [404],
    async () => {
      await api.functional.redditCommunity.member.subscriptions.create(
        subscribedMemberConnection,
        {
          body: {
            reddit_community_communities_id: nonexistentCommunityId,
          } satisfies IRedditCommunitySubscription.ICreate,
        },
      );
    },
  );
}
