import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that retrieving a subscription with a mismatched community ID returns 404.
 *
 * Creates two different communities (A and B), subscribes the authenticated member to Community A, then attempts to retrieve the subscription using Community B's ID as the path parameter. Verifies that the server correctly detects the community mismatch and returns 404 Not Found.
 *
 * 1. Register a new member account via join flow.
 * 2. Create Community A.
 * 3. Create Community B.
 * 4. Subscribe the member to Community A, capturing the subscription ID.
 * 5. Attempt to retrieve the subscription using Community B's ID, expecting 404.
 */
export async function test_api_subscription_retrieval_community_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create Community A
  const communityA =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityA);
  // Step 3: Create Community B
  const communityB =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityB);
  // Step 4: Subscribe to Community A
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: communityA.id },
      },
    );
  typia.assert(subscription);
  // Step 5: Try to retrieve subscription with Community B's ID — expect 404
  await TestValidator.httpError(
    "subscription community mismatch",
    404,
    async () => {
      await api.functional.communityPlatform.member.communities.subscribers.at(
        memberConnection,
        {
          communityId: communityB.id,
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
