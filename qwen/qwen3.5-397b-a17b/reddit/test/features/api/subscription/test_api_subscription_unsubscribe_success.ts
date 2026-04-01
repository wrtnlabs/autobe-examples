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
 * Test successful unsubscribe from a community.
 *
 * This test validates the complete unsubscribe workflow:
 * 1. Creates a member account via join
 * 2. Creates a community to subscribe to
 * 3. Subscribes the member to the community
 * 4. Calls the unsubscribe endpoint with the community name
 * 5. Verifies the response returns 204 No Content (void)
 * 6. Verifies the subscription is removed by attempting to unsubscribe again (should fail with 404)
 */
export async function test_api_subscription_unsubscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community using utility function
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconImageUri: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // Verify subscription was created correctly
  TestValidator.equals(
    "subscription member matches",
    subscription.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "subscription community matches",
    subscription.community.id,
    community.id,
  );
  // 4. Unsubscribe from the community (returns void/204 No Content)
  await api.functional.redditCommunity.member.communities.subscription.erase(
    memberConnection,
    {
      communityName: community.name,
    },
  );
  // 5. Verify subscription was removed by attempting to unsubscribe again
  // This should fail with 404 since the user is no longer subscribed
  await TestValidator.error(
    "unsubscribe again fails (not subscribed)",
    async () => {
      await api.functional.redditCommunity.member.communities.subscription.erase(
        memberConnection,
        {
          communityName: community.name,
        },
      );
    },
  );
  // 6. Verify we can resubscribe successfully (proves unsubscribe worked)
  const resubscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(resubscription);
  TestValidator.equals(
    "resubscription successful",
    resubscription.community.id,
    community.id,
  );
}
