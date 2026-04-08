import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";

/**
 * Test duplicate subscription prevention to the same community.
 *
 * Validates that the system enforces the unique constraint on member-community subscription pairs. The test ensures that users cannot create duplicate subscriptions to the same community, which would violate database constraints and cause data integrity issues.
 *
 * The test follows a complete subscription workflow: member authentication, community creation, successful initial subscription, and duplicate subscription attempt validation. This confirms that the backend properly handles race conditions and prevents duplicate subscription records.
 *
 * 1. Authenticate a member account with randomized credentials.
 * 2. Create a new community that the member will subscribe to.
 * 3. Subscribe the member to the community (first subscription succeeds).
 * 4. Attempt to subscribe the same member to the same community again.
 * 5. Verify the duplicate subscription request is rejected with a 400 error.
 */
export async function test_api_community_subscription_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. First subscription (should succeed)
  const subscription =
    await generate_random_reddit_like_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community matches",
    subscription.community.id,
    community.id,
  );
  // 4. Attempt duplicate subscription (should fail with 400)
  await TestValidator.httpError(
    "duplicate subscription rejected",
    400,
    async () => {
      await generate_random_reddit_like_member_subscriptions_create(
        memberConnection,
        {
          body: {
            communityId: community.id,
          } satisfies IRedditLikeCommunitySubscription.ICreate,
        },
      );
    },
  );
}
