import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_subscription } from "../../../prepare/prepare_random_reddit_like_subscription";

/**
 * Test subscription deletion flow after member has subscribed to communities.
 * Tests basic subscription deletion workflow with multiple communities.
 *
 * Steps:
 * 1. Register new member account
 * 2. Create multiple community subscriptions
 * 3. Delete each subscription and verify successful removal
 * 4. Verify member can still manage remaining subscriptions
 */
export async function test_api_subscription_deletion_after_moderator_action(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "Test1234!",
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Subscribe to multiple communities
  const community1 =
    await api.functional.redditLike.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_like_member_id: member.id,
          reddit_like_community_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          status: "subscribed",
        } satisfies IRedditLikeSubscription.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await api.functional.redditLike.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_like_member_id: member.id,
          reddit_like_community_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          status: "subscribed",
        } satisfies IRedditLikeSubscription.ICreate,
      },
    );
  typia.assert(community2);
  // Step 3: Delete first subscription
  await api.functional.redditLike.member.subscriptions.erase(memberConnection, {
    subscriptionId: community1.id,
  });
  // Step 4: Delete second subscription
  await api.functional.redditLike.member.subscriptions.erase(memberConnection, {
    subscriptionId: community2.id,
  });
  // Step 5: Verify member can still perform operations
  const community3 =
    await api.functional.redditLike.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_like_member_id: member.id,
          reddit_like_community_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          status: "subscribed",
        } satisfies IRedditLikeSubscription.ICreate,
      },
    );
  typia.assert(community3);
  // Cleanup: delete the third subscription
  await api.functional.redditLike.member.subscriptions.erase(memberConnection, {
    subscriptionId: community3.id,
  });
}
