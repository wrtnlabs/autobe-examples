import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMvCommunitySubscriberCount } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMvCommunitySubscriberCount";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_subscribers_count_zero_subscribers(
  connection: api.IConnection,
): Promise<void> {
  // Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Get subscriber count for newly created community (should be 0)
  const subscriberCount1 =
    await api.functional.communityPlatform.communities.subscribers.count.at(
      connection, // Public endpoint, no auth required
      {
        communityId: community.id,
      },
    );
  typia.assert(subscriberCount1);
  // Validate subscriber count is 0 and has proper type
  TestValidator.equals(
    "subscriber count should be zero for new community",
    subscriberCount1.subscriber_count,
    0,
  );
  TestValidator.predicate(
    "subscriber count should be integer ≥ 0",
    subscriberCount1.subscriber_count >= 0 &&
      Number.isInteger(subscriberCount1.subscriber_count),
  );
  // Validate community summary matches created community
  TestValidator.equals(
    "community ID should match",
    subscriberCount1.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name should match",
    subscriberCount1.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description should match",
    subscriberCount1.community.description,
    community.description,
  );
  TestValidator.equals(
    "community owner ID should match",
    subscriberCount1.community.owner.id,
    authorizedMember.id,
  );
  // Validate timestamps are present and recent (within 10 seconds)
  const updatedAt = new Date(subscriberCount1.updated_at).getTime();
  const createdAt = new Date(subscriberCount1.created_at).getTime();
  const now = Date.now();
  TestValidator.predicate(
    "updated_at should be recent",
    now - updatedAt <= 10000,
  );
  TestValidator.predicate(
    "created_at should be recent",
    now - createdAt <= 10000,
  );
  TestValidator.predicate(
    "updated_at should be after or equal to created_at",
    updatedAt >= createdAt,
  );
  // Make second call to ensure consistent results
  const subscriberCount2 =
    await api.functional.communityPlatform.communities.subscribers.count.at(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscriberCount2);
  // Validate second call returns same data
  TestValidator.equals(
    "subscriber count should remain zero",
    subscriberCount2.subscriber_count,
    0,
  );
  TestValidator.equals(
    "community ID should be consistent",
    subscriberCount2.community.id,
    subscriberCount1.community.id,
  );
  TestValidator.equals(
    "subscriber count value should be consistent",
    subscriberCount2.subscriber_count,
    subscriberCount1.subscriber_count,
  );
}
