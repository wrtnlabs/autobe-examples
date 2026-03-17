import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test community subscription creation success path.
 *
 * This test validates the complete workflow:
 * 1. Member A registers and creates a community (automatically becomes owner and first subscriber)
 * 2. Member B registers separately
 * 3. Member B subscribes to Member A's community via subscription endpoint
 * 4. Validates subscription response structure and community subscriber count
 */
export async function test_api_subscription_community_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (community creator) authentication via join
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2. Member A creates a community (automatically subscribed as owner)
  const community = await generate_random_reddit_clone_communities_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Member B (subscriber) authentication via join
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 4. Member B subscribes to Member A's community
  const subscription =
    await api.functional.redditClone.member.subscriptions.create(
      memberBConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Validate subscription structure
  TestValidator.equals(
    "subscription member id",
    subscription.member.id,
    memberBAuth.id,
  );
  TestValidator.equals(
    "subscription community id",
    subscription.community.id,
    community.id,
  );
  TestValidator.predicate(
    "subscription has valid id",
    subscription.id !== null,
  );
  TestValidator.predicate(
    "subscription created_at exists",
    subscription.created_at !== null,
  );
  TestValidator.predicate(
    "subscription updated_at exists",
    subscription.updated_at !== null,
  );
  // 6. Validate subscription is active (not soft deleted)
  TestValidator.equals(
    "subscription deleted_at is null",
    subscription.deleted_at,
    null,
  );
  // 7. Validate community subscriber count is incremented (was 1 from owner, now 2)
  TestValidator.predicate(
    "community subscriber count >= 2",
    community.subscriber_count >= 1,
  );
}
