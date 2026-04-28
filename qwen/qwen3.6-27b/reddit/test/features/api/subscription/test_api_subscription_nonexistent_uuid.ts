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
 * Test the 404 error when retrieving a non-existent subscription by UUID.
 *
 * Validates that the subscription retrieval endpoint properly handles the edge case of querying with a UUID that does not correspond to any existing subscription record. The test sets up a fully authenticated member with a valid community and subscription to ensure the failure occurs from the missing resource, not from authentication or authorization issues.
 *
 * Business rule: When a subscription ID that does not exist is provided, the server must return HTTP 404 Not Found without exposing internal system details or causing unexpected errors.
 *
 * 1. Member registers via join and becomes authenticated.
 * 2. Member creates a community as prerequisite for subscription.
 * 3. Member creates a valid subscription within that community.
 * 4. Member attempts to retrieve a subscription using a valid UUID format that does not exist in the system.
 * 5. Validates that the request returns HTTP 404 error.
 */
export async function test_api_subscription_nonexistent_uuid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create a community as prerequisite
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Create a valid subscription within the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Attempt to retrieve a non-existent subscription with a random UUID
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent subscription returns 404",
    404,
    async () => {
      await api.functional.redditLikeCommunity.member.subscriptions.at(
        memberConnection,
        {
          subscriptionId: nonexistentId,
        },
      );
    },
  );
}
