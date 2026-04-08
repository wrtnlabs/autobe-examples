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

export async function test_api_subscription_update_resubscribe(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
      email: "test@example.com",
      password: "testpassword123",
      username: "testuser",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Create a subscription to a community (status 'active')
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  const initialStatus = subscription.status;
  const initialUpdatedat = subscription.updated_at;
  // 3. Update the subscription status to 'terminated'
  const terminatedSubscription =
    await api.functional.redditCommunity.member.subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          status: "terminated",
        } satisfies IRedditCommunitySubscription.IUpdate,
      },
    );
  typia.assert(terminatedSubscription);
  TestValidator.equals(
    "terminated status after first update",
    terminatedSubscription.status,
    "terminated",
  );
  // When terminated, deleted_at should have a value
  TestValidator.predicate(
    "deleted_at set when terminated",
    terminatedSubscription.deleted_at !== null,
  );
  // 4. Update the subscription status back to 'active' (resubscribe)
  const resubscribeSubscription =
    await api.functional.redditCommunity.member.subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          status: "active",
        } satisfies IRedditCommunitySubscription.IUpdate,
      },
    );
  typia.assert(resubscribeSubscription);
  // 5. Verify the subscription record is returned with status='active'
  TestValidator.equals(
    "resubscribed status after second update",
    resubscribeSubscription.status,
    "active",
  );
  TestValidator.equals(
    "member matches after resubscribe",
    resubscribeSubscription.member.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "community matches after resubscribe",
    resubscribeSubscription.community.id,
    subscription.community.id,
  );
  // When active again, deleted_at should be null
  TestValidator.equals(
    "deleted_at null when active again",
    resubscribeSubscription.deleted_at,
    null,
  );
  // 6. Verify the updated_at timestamp reflects the latest update time
  const updatedAt = new Date(resubscribeSubscription.updated_at);
  const previousUpdatedAt = new Date(terminatedSubscription.updated_at);
  TestValidator.predicate(
    "updated_at is after terminated status",
    updatedAt.getTime() > previousUpdatedAt.getTime(),
  );
  // 7. Verify status can be toggled multiple times (unlimited toggles)
  const secondTerminated =
    await api.functional.redditCommunity.member.subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          status: "terminated",
        } satisfies IRedditCommunitySubscription.IUpdate,
      },
    );
  typia.assert(secondTerminated);
  TestValidator.equals(
    "can toggle to terminated again",
    secondTerminated.status,
    "terminated",
  );
  const secondActive =
    await api.functional.redditCommunity.member.subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          status: "active",
        } satisfies IRedditCommunitySubscription.IUpdate,
      },
    );
  typia.assert(secondActive);
  TestValidator.equals(
    "can toggle back to active again",
    secondActive.status,
    "active",
  );
}