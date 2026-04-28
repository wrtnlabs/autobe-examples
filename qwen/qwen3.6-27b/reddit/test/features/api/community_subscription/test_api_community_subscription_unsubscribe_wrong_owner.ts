import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";

/**
 * Tests that a member cannot delete another member's subscription, enforcing strict ownership validation.
 *
 * Validates that an unauthorized member is forbidden from unsubscribing on behalf of another user. The test establishes two distinct member accounts, creates a community with an active subscription owned by the first member. When the second member attempts to delete this subscription using the subscription identifier, the system must reject the request with a 403 Forbidden error. This ensures that subscription modifications are strictly scoped to the authenticated owner and prevents unauthorized account manipulation or data deletion.
 *
 * 1. MemberA authenticates via join to establish account credentials.
 * 2. MemberA creates a community to serve as the subscription target.
 * 3. MemberA subscribes to the community, obtaining a subscription identifier.
 * 4. MemberB authenticates via join to establish a separate, independent account.
 * 5. MemberB attempts to delete MemberA's subscription using the subscription identifier.
 */
export async function test_api_community_subscription_unsubscribe_wrong_owner(
  connection: api.IConnection,
) {
  // 1. MemberA authenticates via join
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    },
  });
  // 2. MemberA creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. MemberA subscribes to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. MemberB authenticates via join
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    },
  });
  // 5. MemberB attempts to delete MemberA's subscription
  await TestValidator.httpError(
    "403 Forbidden when wrong owner attempts to delete subscription",
    403,
    async () => {
      await api.functional.redditLikeCommunity.member.community_subscriptions.erase(
        memberBConnection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
