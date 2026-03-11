import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_subscriptions_subscribe } from "../../../generate/generate_random_reddit_platform_member_subscriptions_subscribe";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";

export async function test_api_subscription_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 2. Generate a valid community ID for subscription
  // Note: In real scenarios, we would create a community first
  // Using typia.random to generate a UUID that matches the community ID format
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. First subscription attempt (will create subscription)
  const firstSubscription =
    await api.functional.redditPlatform.member.subscriptions.subscribe(
      memberConnection,
      {
        body: {
          reddit_platform_community_id: communityId,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(firstSubscription);
  // Verify first subscription is valid
  TestValidator.equals(
    "first subscription has valid community",
    firstSubscription.community_id,
    communityId,
  );
  TestValidator.equals(
    "first subscription member matches",
    firstSubscription.member_id,
    memberAuth.user.id,
  );
  // 4. Duplicate subscription attempt (should fail with 409 Conflict)
  await TestValidator.error("duplicate subscription rejected", async () => {
    await api.functional.redditPlatform.member.subscriptions.subscribe(
      memberConnection,
      {
        body: {
          reddit_platform_community_id: communityId,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  });
  // 5. Verify first subscription remains valid after duplicate attempt
  TestValidator.equals(
    "first subscription still valid after duplicate attempt",
    firstSubscription.community_id,
    communityId,
  );
  TestValidator.equals(
    "first subscription member unchanged",
    firstSubscription.member_id,
    memberAuth.user.id,
  );
}
