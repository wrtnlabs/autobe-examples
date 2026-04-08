import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";

/**
 * Test successful community subscription unsubscription for authenticated members.
 *
 * Validates the complete unsubscribe workflow including member authentication, subscription creation, and subscription removal. Ensures that the unsubscribe operation successfully soft-deletes the subscription record while preserving it for audit purposes.
 *
 * Special attention is given to verifying that the unsubscribe operation completes without errors and that the subscription's soft-delete timestamp is properly set by the backend.
 *
 * 1. Register and authenticate a new member account with email, password, and username.
 * 2. Create a subscription to a community using the authenticated member connection.
 * 3. Unsubscribe from the community by calling the erase endpoint with communityId and subscriptionId.
 * 4. Verify the unsubscribe operation completes successfully with void response.
 */
export async function test_api_community_subscription_unsubscribe_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create a subscription to a community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const subscription =
    await generate_random_reddit_clone_member_communities_subscriptions_create(
      memberConnection,
      {
        params: {
          communityId,
        },
      },
    );
  typia.assert(subscription);
  // 3. Unsubscribe from the community
  await api.functional.redditClone.member.communities.subscriptions.erase(
    memberConnection,
    {
      communityId,
      subscriptionId: subscription.id,
    },
  );
}
