import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test soft-deleted subscription retrieval to verify audit trail preservation.
 *
 * Validates that soft-deleted subscription records remain accessible via the
 * subscription endpoint, confirming that the system preserves subscription
 * history for audit purposes. The test verifies that deleted_at timestamps
 * are properly set while other subscription data remains intact, ensuring
 * compliance and debugging capabilities are maintained even after
 * unsubscription.
 *
 * The subscription record should remain retrievable with full details including
 * the original subscription timestamp, community information, and deletion
 * markers. This is critical for maintaining subscription history and
 * auditing compliance requirements.
 *
 * 1. Register and authenticate a member using POST /redditPlatform/auth/member/join.
 * 2. Create a test community using POST /redditPlatform/member/communities.
 * 3. Subscribe the member to the community using POST /redditPlatform/member/communities/:name/subscribe.
 * 4. Delete the subscription using DELETE /redditPlatform/member/communities/:name/subscribe.
 * 5. Retrieve the soft-deleted subscription using GET /redditPlatform/member/subscribed/:subscriptionId.
 * 6. Validate that the subscription is accessible with deleted_at timestamp set.
 */
export async function test_api_subscription_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 2. Create a test community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "test_" + RandomGenerator.alphaNumeric(6),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community (create subscription)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Delete subscription (soft-delete via unsubscription)
  await api.functional.redditPlatform.member.communities._subscribe.erase(
    memberConnection,
    {
      name: community.name,
    },
  );
  // 5. Retrieve soft-deleted subscription by ID
  const retrievedSubscription =
    await api.functional.redditPlatform.member.subscribed.at(memberConnection, {
      subscriptionId: subscription.id,
    });
  typia.assert(retrievedSubscription);
  // 6. Validate soft-deleted subscription record
  TestValidator.equals(
    "subscription id matches",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "subscription belongs to correct community",
    retrievedSubscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name preserved",
    retrievedSubscription.community.name,
    community.name,
  );
  // Validate deleted_at is set (soft-deletion marker)
  TestValidator.notEquals(
    "deleted_at should be set for soft-deleted subscription",
    retrievedSubscription.deleted_at,
    null,
  );
  // Validate subscribed_at is preserved (original subscription date)
  TestValidator.notEquals(
    "subscribed_at should be preserved",
    retrievedSubscription.subscribed_at,
    null,
  );
  // Validate created_at exists
  TestValidator.notEquals(
    "created_at should exist",
    retrievedSubscription.created_at,
    null,
  );
  // Validate community summary has required nested fields
  TestValidator.notEquals(
    "community id in nested summary should exist",
    retrievedSubscription.community.id,
    null,
  );
  TestValidator.notEquals(
    "community name in nested summary should exist",
    retrievedSubscription.community.name,
    null,
  );
}
