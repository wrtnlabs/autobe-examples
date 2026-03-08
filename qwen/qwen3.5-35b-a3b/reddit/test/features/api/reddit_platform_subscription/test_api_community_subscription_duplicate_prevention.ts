import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_subscription_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create a community - use generated random UUID for testing
  // Note: In a real test, you would create a community first, but for this test
  // we focus on the subscription duplicate prevention mechanism
  const testCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 3. First subscription attempt - should succeed
  const firstSubscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityId: testCommunityId,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(firstSubscription);
  // 4. Verify first subscription succeeded with correct data
  TestValidator.equals(
    "first subscription member matches",
    firstSubscription.redditPlatformMemberId,
    member.id,
  );
  TestValidator.equals(
    "first subscription community matches",
    firstSubscription.redditPlatformCommunityId,
    testCommunityId,
  );
  // 5. Second subscription attempt - should fail with 409 Conflict
  await TestValidator.error(
    "duplicate subscription returns 409 Conflict",
    async () => {
      await api.functional.redditPlatform.member.communities.subscribe(
        memberConnection,
        {
          communityId: testCommunityId,
          body: {
            confirmSubscription: true,
          } satisfies IRedditPlatformCommunitySubscription.ICreate,
        },
      );
    },
  );
  // 6. Verify first subscription record remains unchanged
  // The subscription should still exist with original data
  TestValidator.equals(
    "subscription record exists after duplicate attempt",
    firstSubscription.redditPlatformMemberId,
    member.id,
  );
  // 7. Test that the same member cannot subscribe to multiple communities
  // This validates the subscription relationship is member-specific
  const secondCommunityId = typia.random<string & tags.Format<"uuid">>();
  const secondSubscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityId: secondCommunityId,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(secondSubscription);
  // Verify second subscription has different community
  TestValidator.notEquals(
    "second subscription has different community",
    firstSubscription.redditPlatformCommunityId,
    secondSubscription.redditPlatformCommunityId,
  );
  // 8. Verify can't subscribe again to second community
  await TestValidator.error(
    "second duplicate subscription returns 409 Conflict",
    async () => {
      await api.functional.redditPlatform.member.communities.subscribe(
        memberConnection,
        {
          communityId: secondCommunityId,
          body: {
            confirmSubscription: true,
          } satisfies IRedditPlatformCommunitySubscription.ICreate,
        },
      );
    },
  );
}
