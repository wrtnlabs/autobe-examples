import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

/**
 * Test subscription retrieval by subscriber.
 *
 * This test verifies that an authenticated member can successfully retrieve
 * their own subscription by its unique identifier. The test flow:
 * 1. Register a new member
 * 2. Create a community to subscribe to
 * 3. Subscribe to the community
 * 4. Retrieve the subscription using its ID
 * 5. Validate the returned subscription contains all expected fields
 */
export async function test_api_subscription_retrieval_by_subscriber(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a community to subscribe to
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Retrieve the subscription using its ID
  const retrievedSubscription =
    await api.functional.redditClone.member.subscriptions.at(memberConnection, {
      subscriptionId: subscription.id,
    });
  typia.assert(retrievedSubscription);
  // 5. Validate the returned subscription
  TestValidator.equals(
    "subscription ID matches",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.predicate(
    "has valid created_at",
    retrievedSubscription.created_at !== null &&
      retrievedSubscription.created_at !== undefined,
  );
  TestValidator.equals(
    "member username matches",
    retrievedSubscription.member.username,
    member.username,
  );
  TestValidator.equals(
    "community name matches",
    retrievedSubscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    retrievedSubscription.community.description,
    community.description,
  );
  TestValidator.predicate(
    "subscriber count is valid",
    retrievedSubscription.community.subscriber_count >= 1,
  );
}
