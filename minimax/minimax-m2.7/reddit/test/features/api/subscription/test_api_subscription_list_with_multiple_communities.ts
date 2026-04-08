import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
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
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_subscription_list_with_multiple_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create 3 different communities
  const community1 =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community2);
  const community3 =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community3);
  // 3. Subscribe to all 3 communities
  const subscription1 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: { communityId: community1.id },
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: { communityId: community2.id },
      },
    );
  typia.assert(subscription2);
  const subscription3 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: { communityId: community3.id },
      },
    );
  typia.assert(subscription3);
  // 4. Call GET /redditClone/member/subscriptions
  const result =
    await api.functional.redditClone.member.subscriptions.list(
      memberConnection,
    );
  typia.assert(result);
  // 5. Validate response - data array contains exactly 3 subscription records
  TestValidator.equals(
    "data array contains 3 subscriptions",
    result.data.length,
    3,
  );
  // Validate each subscription has required properties
  for (const subscription of result.data) {
    TestValidator.predicate(
      "subscription has valid UUID id",
      /^\d{8}-\d{4}-\d{4}-\d{4}-\d{12}$/i.test(subscription.id),
    );
    TestValidator.predicate(
      "subscription has valid ISO timestamp createdAt",
      !isNaN(Date.parse(subscription.createdAt)),
    );
    TestValidator.predicate(
      "subscription has community object",
      subscription.community !== null && subscription.community !== undefined,
    );
    TestValidator.predicate(
      "community has id",
      subscription.community.id !== null &&
        subscription.community.id !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      subscription.community.name !== null &&
        subscription.community.name !== undefined,
    );
    TestValidator.predicate(
      "community has description",
      subscription.community.description !== null &&
        subscription.community.description !== undefined,
    );
    TestValidator.predicate(
      "community has subscriberCount",
      typeof subscription.community.subscriberCount === "number",
    );
    TestValidator.predicate(
      "community has owner",
      subscription.community.owner !== null &&
        subscription.community.owner !== undefined,
    );
  }
  // Validate pagination metadata
  TestValidator.equals(
    "pagination records equals 3",
    result.pagination.records,
    3,
  );
  TestValidator.equals("pagination pages equals 1", result.pagination.pages, 1);
  TestValidator.equals(
    "pagination current equals 1",
    result.pagination.current,
    1,
  );
  // Validate ordering by createdAt DESC (most recent first)
  const timestamps = result.data.map((s) => new Date(s.createdAt).getTime());
  for (let i = 0; i < timestamps.length - 1; i++) {
    TestValidator.predicate(
      `subscription ${i} is more recent than ${i + 1}`,
      timestamps[i] >= timestamps[i + 1],
    );
  }
  // Validate that all created communities are in the subscription list
  const subscribedCommunityIds = result.data.map((s) => s.community.id);
  TestValidator.predicate(
    "community1 in subscription list",
    subscribedCommunityIds.includes(community1.id),
  );
  TestValidator.predicate(
    "community2 in subscription list",
    subscribedCommunityIds.includes(community2.id),
  );
  TestValidator.predicate(
    "community3 in subscription list",
    subscribedCommunityIds.includes(community3.id),
  );
}
