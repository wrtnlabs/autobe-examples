import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test community subscriber count accuracy.
 *
 * Validates that the subscriber_count field in community details accurately
 * reflects the total number of active subscriptions. Creates multiple member
 * accounts, has them subscribe to the same community, then verifies the count.
 */
export async function test_api_community_subscriber_count_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create community with unique name
  const communityName = `test_community_${RandomGenerator.alphabets(8)}`;
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);
  // 3. Create second member and subscribe
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  const subscription2 =
    await api.functional.redditCommunity.member.communities.subscription.create(
      member2Connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(subscription2);
  TestValidator.equals(
    "subscription community matches",
    subscription2.community.name,
    communityName,
  );
  // 4. Create third member and subscribe
  const member3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  const subscription3 =
    await api.functional.redditCommunity.member.communities.subscription.create(
      member3Connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(subscription3);
  TestValidator.equals(
    "subscription community matches",
    subscription3.community.name,
    communityName,
  );
  // 5. Retrieve community details and verify subscriber count
  const communityDetails = await api.functional.redditCommunity.communities.at(
    connection,
    {
      communityName: communityName,
    },
  );
  typia.assert(communityDetails);
  // Verify subscriber count is 2 (two members subscribed)
  TestValidator.equals(
    "subscriber count should be 2",
    communityDetails.subscriber_count,
    2,
  );
  TestValidator.equals(
    "community name matches",
    communityDetails.name,
    communityName,
  );
  TestValidator.equals(
    "community id matches",
    communityDetails.id,
    community.id,
  );
}
