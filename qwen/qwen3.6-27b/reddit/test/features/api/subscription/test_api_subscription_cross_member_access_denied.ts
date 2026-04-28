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
 * Test the authorization guard preventing cross-member subscription data access.
 *
 * Validates that subscription records are private to the subscribing member. Two separate member accounts are registered with distinct credentials. Member A creates a community and subscribes to it, generating subscription data that belongs exclusively to Member A. Member B, authenticated with a separate session, attempts to retrieve Member A's subscription by its ID.
 *
 * The system must return HTTP 403 Forbidden, confirming that authenticated users cannot view other members' subscription records even when they possess the subscription's UUID. This enforces proper data isolation between user accounts.
 *
 * 1. Register and authenticate Member A.
 * 2. Member A creates a community and subscribes to it.
 * 3. Register and authenticate Member B with separate credentials.
 * 4. Member B attempts to access Member A's subscription.
 * 5. Validate HTTP 403 Forbidden is returned.
 */
export async function test_api_subscription_cross_member_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      username: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    },
  });
  // 2. Member A creates a community and subscribes to it
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberAConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 3. Register and authenticate Member B with separate credentials
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      username: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    },
  });
  // 4 & 5. Member B attempts to access Member A's subscription - should get 403 Forbidden
  await TestValidator.httpError(
    "cross-member subscription access denied",
    403,
    async () =>
      await api.functional.redditLikeCommunity.member.subscriptions.at(
        memberBConnection,
        {
          subscriptionId: subscription.id,
        },
      ),
  );
}
