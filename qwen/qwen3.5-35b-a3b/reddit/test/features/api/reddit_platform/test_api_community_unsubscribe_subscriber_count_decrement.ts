import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_unsubscribe_subscriber_count_decrement(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate primary member (member_a)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  // Step 2: Authenticate additional member (member_b)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  // Step 3: Create a community for subscription testing
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 4: Subscribe primary member (member_a) to the community
  const subscriptionA =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionA);
  // Step 5: Subscribe additional member (member_b) to establish a known subscriber count
  const subscriptionB =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberBConnection,
      {
        communityId: community.id,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionB);
  // Step 6: Verify the initial subscriber count from the second subscription response
  TestValidator.equals(
    "initial subscriber count (from subscription response)",
    subscriptionB.community.subscriber_count,
    2,
  );
  // Step 7: Unsubscribe the primary member from the community
  await api.functional.redditPlatform.member.communities.unsubscribe(
    memberAConnection,
    {
      communityId: community.id,
    },
  );
  // Step 8: Subscribe member_a again to verify the count increases back to 2
  const subscriptionARe =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionARe);
  // Step 9: Verify subscriber count is back to 2 after re-subscription
  TestValidator.equals(
    "subscriber count after re-subscription",
    subscriptionARe.community.subscriber_count,
    2,
  );
  // Step 10: Unsubscribe member_b to verify count decrements to 1
  await api.functional.redditPlatform.member.communities.unsubscribe(
    memberBConnection,
    {
      communityId: community.id,
    },
  );
  // Step 11: Subscribe member_b again to verify count increases back to 2
  const subscriptionBRe =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberBConnection,
      {
        communityId: community.id,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionBRe);
  // Step 12: Verify subscriber count is back to 2 after member_b re-subscription
  TestValidator.equals(
    "subscriber count after member_b re-subscription",
    subscriptionBRe.community.subscriber_count,
    2,
  );
  // Step 13: Unsubscribe both members and verify final state
  await api.functional.redditPlatform.member.communities.unsubscribe(
    memberAConnection,
    {
      communityId: community.id,
    },
  );
  const subscriptionBFinal =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberBConnection,
      {
        communityId: community.id,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionBFinal);
  // Step 14: Verify subscriber count is back to 2
  TestValidator.equals(
    "subscriber count in final state",
    subscriptionBFinal.community.subscriber_count,
    2,
  );
}
