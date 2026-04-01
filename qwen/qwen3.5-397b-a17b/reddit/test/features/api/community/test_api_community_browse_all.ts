import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
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
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_browse_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three member accounts
  const member1Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member1Auth);
  const member2Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member2Auth);
  const member3Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member3Auth);
  // 2. Create three communities with different owners
  const member1Connection: api.IConnection = { host: connection.host };
  member1Connection.headers = {
    Authorization: `Bearer ${member1Auth.token.access}`,
  };
  const community1 =
    await generate_random_reddit_community_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community1);
  const member2Connection: api.IConnection = { host: connection.host };
  member2Connection.headers = {
    Authorization: `Bearer ${member2Auth.token.access}`,
  };
  const community2 =
    await generate_random_reddit_community_member_communities_create(
      member2Connection,
      {},
    );
  typia.assert(community2);
  const member3Connection: api.IConnection = { host: connection.host };
  member3Connection.headers = {
    Authorization: `Bearer ${member3Auth.token.access}`,
  };
  const community3 =
    await generate_random_reddit_community_member_communities_create(
      member3Connection,
      {},
    );
  typia.assert(community3);
  // 3. Subscribe member3 to community1 and community2
  const subscriberConnection: api.IConnection = { host: connection.host };
  subscriberConnection.headers = {
    Authorization: `Bearer ${member3Auth.token.access}`,
  };
  const subscription1 =
    await api.functional.redditCommunity.member.communities.subscription.create(
      subscriberConnection,
      {
        communityName: community1.name,
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await api.functional.redditCommunity.member.communities.subscription.create(
      subscriberConnection,
      {
        communityName: community2.name,
      },
    );
  typia.assert(subscription2);
  // 4. Browse all communities
  const browseResult = await api.functional.redditCommunity.communities.index(
    connection,
    {
      body: {} satisfies IRedditCommunityCommunity.IRequest,
    },
  );
  typia.assert(browseResult);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "has pagination",
    browseResult.pagination !== undefined,
  );
  TestValidator.equals("current page", browseResult.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    browseResult.pagination.limit > 0,
  );
  TestValidator.equals("total records", browseResult.pagination.records, 3);
  TestValidator.equals("total pages", browseResult.pagination.pages, 1);
  // 6. Validate community data
  TestValidator.predicate("has 3 communities", browseResult.data.length === 3);
  // Find communities by name
  const foundCommunity1 = browseResult.data.find(
    (c) => c.name === community1.name,
  );
  const foundCommunity2 = browseResult.data.find(
    (c) => c.name === community2.name,
  );
  const foundCommunity3 = browseResult.data.find(
    (c) => c.name === community3.name,
  );
  TestValidator.predicate("community1 exists", foundCommunity1 !== undefined);
  TestValidator.predicate("community2 exists", foundCommunity2 !== undefined);
  TestValidator.predicate("community3 exists", foundCommunity3 !== undefined);
  // Validate subscriber counts
  TestValidator.equals(
    "community1 subscriber count",
    foundCommunity1!.subscriber_count,
    1,
  );
  TestValidator.equals(
    "community2 subscriber count",
    foundCommunity2!.subscriber_count,
    1,
  );
  TestValidator.equals(
    "community3 subscriber count",
    foundCommunity3!.subscriber_count,
    0,
  );
  // Validate owner information
  TestValidator.equals(
    "community1 owner id",
    foundCommunity1!.owner.id,
    member1Auth.id,
  );
  TestValidator.equals(
    "community2 owner id",
    foundCommunity2!.owner.id,
    member2Auth.id,
  );
  TestValidator.equals(
    "community3 owner id",
    foundCommunity3!.owner.id,
    member3Auth.id,
  );
  // Validate sorting (created_at DESC - newest first)
  const timestamps = browseResult.data.map((c) =>
    new Date(c.created_at).getTime(),
  );
  TestValidator.predicate("sorted by created_at DESC", () => {
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i - 1] < timestamps[i]) return false;
    }
    return true;
  });
}