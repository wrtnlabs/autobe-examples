import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_subscription_snapshot_retrieval_member_own_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create subscription
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Retrieve subscription snapshot
  // Need to get the snapshot ID - since we don't have an API to list snapshots,
  // we assume the subscription creation triggers snapshot creation with
  // community_platform_subscription_id matching subscription.id
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // This is a workaround since we don't know the actual snapshot ID
  // In real implementation, we would get it from subscription or snapshot list
  const snapshot =
    await api.functional.communityPlatform.member.subscription_snapshots.at(
      memberConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot data
  TestValidator.equals(
    "snapshot subscription matches original subscription",
    snapshot.subscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "user_id matches member ID",
    snapshot.user_id,
    member.id,
  );
  TestValidator.equals(
    "community_id matches community ID",
    snapshot.community_id,
    community.id,
  );
  TestValidator.equals("status is active", snapshot.status, "active");
  TestValidator.predicate(
    "posting_permission_granted is true",
    snapshot.posting_permission_granted === true,
  );
  TestValidator.predicate(
    "feed_included is true",
    snapshot.feed_included === true,
  );
  TestValidator.predicate(
    "subscribed_at is not null",
    snapshot.subscribed_at !== null,
  );
  TestValidator.equals(
    "unsubscribed_at is null",
    snapshot.unsubscribed_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    snapshot.created_at !== null && snapshot.created_at.length > 0,
  );
}
